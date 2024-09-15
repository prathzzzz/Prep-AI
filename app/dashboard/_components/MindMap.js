import React from 'react';
import { MindMap, MindMapNode } from '@xyflow/react';

const convertPrerequisitesToMindMapNodes = (prerequisites) => {
  const nodes = prerequisites.map(prereq => ({
    id: prereq.title,
    label: prereq.title,
    children: prereq.descriptions.map((desc, index) => ({
      id: `${prereq.title}-${index}`,
      label: desc,
      parent: prereq.title,
    })),
  }));
  return nodes;
};

const MindMapComponent = ({ prerequisites }) => {
  const mindMapData = convertPrerequisitesToMindMapNodes(prerequisites);

  return (
    <div style={{ height: '600px', width: '100%' }}>
      <MindMap
        nodes={mindMapData}
        nodeStyle={{ fill: '#fff', stroke: '#000', strokeWidth: 2 }}
        linkStyle={{ stroke: '#000', strokeWidth: 2 }}
      />
    </div>
  );
};

export default MindMapComponent;
