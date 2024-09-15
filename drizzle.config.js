/** @type { import("drizzle-kit").Config } */
export default {
    schema: "./utils/schema.js",
    dialect: 'postgresql',
    dbCredentials: {
      url: 'postgresql://ai-interview-mocker_owner:S9C4BiLlGYDc@ep-still-dew-a16iuvm5.ap-southeast-1.aws.neon.tech/ai-interview-mocker?sslmode=require',
    }
  };