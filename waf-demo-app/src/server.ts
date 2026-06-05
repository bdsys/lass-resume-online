import { buildApp } from "./app";

const port = parseInt(process.env.PORT ?? "8080", 10);
const app = buildApp();

app.listen(port, "0.0.0.0", () => {
  console.log(`waf-demo listening on :${port}`);
  console.log(`X-Demo-Key gate: ${process.env.DEMO_KEY ? "armed" : "UNSET — all /api requests will return 423"}`);
});
