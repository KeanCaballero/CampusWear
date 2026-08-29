import { createApp } from "../../server/_core/app";

// Vercel treats this file as the serverless handler for every /api/trpc/* call.
export default createApp();

