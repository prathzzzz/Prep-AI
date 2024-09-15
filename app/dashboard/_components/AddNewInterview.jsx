"use client";
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LoaderCircle } from "lucide-react";
import { chatSession } from "@/utils/GeminiAIModal";
import { MockInterview } from "@/utils/schema";
import { v4 as uuidv4 } from 'uuid';
import { db } from "@/utils/db";
import { useUser } from "@clerk/nextjs";
import moment from "moment";
import { useRouter } from "next/navigation";

function AddNewInterview() {
  const [openDialog, setOpenDialog] = useState(false);
  const [jobPosition, setJobPosition] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobExperience, setJobExperience] = useState("");
  const [loading, setLoading] = useState(false);
  const [prerequisites, setPrerequisites] = useState([]);
  const [detailedExplanation, setDetailedExplanation] = useState([]);
  const [openPrerequisiteDialog, setOpenPrerequisiteDialog] = useState(false);
  const [openExplanationDialog, setOpenExplanationDialog] = useState(false);
  const { user } = useUser();
  const router = useRouter();

  const generatePrerequisites = async () => {
    setLoading(true);
    const inputPrompt = `Generate prerequisites for a Data Structures interview for a ${jobPosition} position with the following job description: ${jobDescription}. The candidate has ${jobExperience} years of experience. Provide a list of 5-7 key prerequisites related to data structures. Format each prerequisite as 'Title: Description'. Each title can have multiple descriptions under it. Separate titles and descriptions with a newline. Do not include any asterisks or Markdown formatting in the response.`;

    try {
      if (!jobPosition || !jobDescription || !jobExperience) {
        throw new Error("Job position, description, and experience are required.");
      }
      const result = await chatSession.sendMessage(inputPrompt);
      const responseText = await result.response.text();

      if (!responseText.trim()) {
        throw new Error("Empty response from the API.");
      }

      const sections = responseText.split('\n\n').filter(section => section.trim() !== '');
      const parsedPrerequisites = sections.map(section => {
        const [title, ...descriptions] = section.split('\n');
        return {
          title: title.trim(),
          descriptions: descriptions.map(desc => desc.trim()).filter(desc => desc !== '')
        };
      });

      setPrerequisites(parsedPrerequisites);
      setOpenPrerequisiteDialog(true);
    } catch (error) {
      console.error("Error generating prerequisites:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateDetailedExplanation = async () => {
    if (prerequisites.length === 0) {
      console.error("No prerequisites available for detailed explanation.");
      return;
    }
  
    setLoading(true);
    const topics = prerequisites.map(prereq => prereq.title).join(", ");
    const inputPrompt = `For a ${jobPosition} position with ${jobExperience} years of experience, provide a detailed, in-depth explanation for each of the following data structure topics: ${topics}. For each topic:
    1. Provide a comprehensive explanation of the concept, its implementation, and its significance in data structures.
    2. Include specific use cases and scenarios where this data structure is particularly useful in the context of a ${jobPosition} role.
    3. Offer a complex, real-world example that demonstrates the application of this data structure in solving a problem relevant to the job description: ${jobDescription}
    4. Discuss any advanced techniques or optimizations related to this data structure that a ${jobPosition} with ${jobExperience} years of experience should be familiar with.
    5. Mention any common pitfalls or misconceptions about this data structure and how to avoid them.

    Format the response for each topic as follows:
    - Topic: {topic name}
      - Explanation: {detailed, original explanation}
      - Use Cases: {specific use cases relevant to the job}
      - Example: {complex, real-world example}
      - Advanced Techniques: {advanced concepts and optimizations}
      - Common Pitfalls: {pitfalls and how to avoid them}

    Ensure the explanations are tailored to the specific job position and experience level, avoiding generic content. Do not use any markdown formatting or special characters in the response.`;
  
    try {
      const result = await chatSession.sendMessage(inputPrompt);
      const responseText = await result.response.text();
  
      if (!responseText.trim()) {
        throw new Error("Empty response from the API.");
      }
  
      const sections = responseText.split('\n\n').filter(section => section.trim() !== '');
      const parsedExplanation = sections.map(section => {
        const lines = section.split('\n').map(line => line.trim());
        const topicLine = lines[0]?.replace('Topic: ', '') || 'Unknown Topic';
        const explanationLine = lines.find(l => l.startsWith('Explanation:'))?.replace('Explanation: ', '') || 'No explanation provided.';
        const useCasesLine = lines.find(l => l.startsWith('Use Cases:'))?.replace('Use Cases: ', '') || 'No use cases provided.';
        const exampleLine = lines.find(l => l.startsWith('Example:'))?.replace('Example: ', '') || 'No example provided.';
        const advancedTechniquesLine = lines.find(l => l.startsWith('Advanced Techniques:'))?.replace('Advanced Techniques: ', '') || 'No advanced techniques provided.';
        const commonPitfallsLine = lines.find(l => l.startsWith('Common Pitfalls:'))?.replace('Common Pitfalls: ', '') || 'No common pitfalls provided.';
  
        return {
          topic: topicLine,
          explanation: explanationLine,
          useCases: useCasesLine,
          example: exampleLine,
          advancedTechniques: advancedTechniquesLine,
          commonPitfalls: commonPitfallsLine,
        };
      });
  
      setDetailedExplanation(parsedExplanation);
      setOpenExplanationDialog(true);
    } catch (error) {
      console.error("Error generating detailed explanations:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    await generatePrerequisites();
  };

  const startInterview = async () => {
    setLoading(true);
    const inputPrompt = `Job position: ${jobPosition}, Job Description: ${jobDescription}, Years of Experience: ${jobExperience}, Depends on Job Position, Job Description and Years of Experience give us ${process.env.NEXT_PUBLIC_INTERVIEW_QUESTION_COUNT} Interview questions related to data structures along with answers in JSON format. Each question and answer should be in the format:
    {
      "question": "Your question here",
      "answer": "Your answer here"
    }`;

    try {
      const result = await chatSession.sendMessage(inputPrompt);
      const responseText = await result.response.text();
      const jsonMatch = responseText.match(/\[.*?\]/s);
      if (!jsonMatch) {
        throw new Error("No valid JSON array found in the response");
      }

      const jsonResponsePart = jsonMatch[0];
      const mockResponse = JSON.parse(jsonResponsePart.trim());
      const jsonString = JSON.stringify(mockResponse);
      const res = await db.insert(MockInterview)
        .values({
          mockId: uuidv4(),
          jsonMockResp: jsonString,
          jobPosition: jobPosition,
          jobDesc: jobDescription,
          jobExperience: jobExperience,
          createdBy: user?.primaryEmailAddress?.emailAddress,
          createdAt: moment().format('DD-MM-YYYY'),
        }).returning({ mockId: MockInterview.mockId });
      router.push(`dashboard/interview/${res[0]?.mockId}`);
    } catch (error) {
      console.error("Error fetching interview questions:", error.message);
    } finally {
      setLoading(false);
      setOpenPrerequisiteDialog(false);
      setOpenExplanationDialog(false);
    }
  };

  return (
    <div>
      <div
        className="p-10 border rounded-lg bg-secondary hover:scale-105 hover:shadow-md cursor-pointer transition-all"
        onClick={() => setOpenDialog(true)}
      >
        <h1 className="font-bold text-lg text-center">+ Add New Data Structures Interview</h1>
      </div>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">New Data Structures Interview</DialogTitle>
            <DialogDescription>
              Provide details about the data structures interview position.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit}>
            <div className="grid gap-7 py-6">
              <div className="grid grid-cols-4 items-center gap-5">
                <label htmlFor="job-position" className="text-right">
                  Job Position
                </label>
                <Input
                  id="job-position"
                  className="col-span-3"
                  placeholder="Ex. Data Structures Specialist"
                  required
                  onChange={(e) => setJobPosition(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="job-description" className="text-right">
                  Job Description
                </label>
                <Textarea
                  id="job-description"
                  className="col-span-3"
                  placeholder="Ex. Knowledge in various data structures like arrays, linked lists, trees, etc."
                  required
                  onChange={(e) => setJobDescription(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="experience" className="text-right">
                  Experience
                </label>
                <Input
                  id="experience"
                  className="col-span-3"
                  type="number"
                  placeholder="Ex. 5"
                  min="1"
                  max="70"
                  required
                  onChange={(e) => setJobExperience(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    Loading
                  </>
                ) : (
                  "Generate Prerequisites"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Prerequisites Dialog */}
      <Dialog open={openPrerequisiteDialog} onOpenChange={setOpenPrerequisiteDialog}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Prerequisites</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {prerequisites.map((item, index) => (
              <div key={index} className="border p-4 rounded-md mb-2">
                <h3 className="text-lg font-bold">{item.title}</h3>
                {item.descriptions.map((desc, i) => (
                  <p key={i} className="ml-4">{desc}</p>
                ))}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              // onClick={generateDetailedExplanation}
              disabled={loading}
              className="w-full mt-4"
            >
              {loading ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Loading
                </>
              ) : (
                "Generate Detailed Explanation"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detailed Explanation Dialog */}
      <Dialog open={openExplanationDialog} onOpenChange={setOpenExplanationDialog}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold mb-4">Detailed Explanations for {jobPosition}</DialogTitle>
            <DialogDescription>
              Experience Level: {jobExperience} years | Job Description: {jobDescription}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 space-y-8">
            {detailedExplanation.map((item, index) => (
              <div key={index} className="border-2 border-gray-200 p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold mb-4 text-primary">{item.topic}</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-lg mb-2">Explanation</h4>
                    <p className="text-gray-700">{item.explanation}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg mb-2">Use Cases</h4>
                    <p className="text-gray-700">{item.useCases}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg mb-2">Example</h4>
                    <p className="text-gray-700">{item.example}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg mb-2">Advanced Techniques</h4>
                    <p className="text-gray-700">{item.advancedTechniques}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg mb-2">Common Pitfalls</h4>
                    <p className="text-gray-700">{item.commonPitfalls}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              onClick={startInterview}
              disabled={loading}
              className="w-full mt-6"
            >
              {loading ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Loading
                </>
              ) : (
                "Start Interview"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AddNewInterview;