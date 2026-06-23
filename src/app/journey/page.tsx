import type { Metadata } from "next";
import { JourneyExperience } from "@/components/journey/JourneyExperience";
import { PlugInButton } from "@/components/plug-in-button";

export const metadata: Metadata = {
  title: "Journey",
  description:
    "An interactive walk through Andrew Lass's career — animated DMZ packet flow, a self-deploying CI/CD pipeline, the career backbone, and live impact telemetry.",
};

export default function JourneyPage() {
  return (
    <div style={{ position: "relative" }}>
      {/* Immersive return control — replaces the standard toolbar/footer on this route */}
      <div
        style={{
          position: "fixed",
          top: 18,
          left: 18,
          zIndex: 100,
        }}
      >
        <PlugInButton href="/" variant="toolbar" label="◂ Unplug…" alwaysOn={false} />
      </div>

      <JourneyExperience />

      {/* Secondary exit near the end so users always have a way back */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "0 24px 64px",
          background: "#070d14",
        }}
      >
        <PlugInButton href="/" variant="pill" label="◂ Unplug — back to andrewlass.com" />
      </div>
    </div>
  );
}
