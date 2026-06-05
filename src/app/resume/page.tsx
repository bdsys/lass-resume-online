import type { Metadata } from "next";
import { getResume } from "@/lib/resume";
import { ResumeView } from "@/components/resume-view";

const resume = getResume();

export const metadata: Metadata = {
  title: "Resume",
  description: `${resume.headline} — Andrew Lass resume.`,
};

export default function ResumePage() {
  return <ResumeView resume={resume} />;
}
