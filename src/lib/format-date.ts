const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function formatDate(s: string): string {
  if (s.toLowerCase() === "present") return "Present";
  const [year, month] = s.split("-");
  return `${MONTHS[parseInt(month, 10) - 1]} ${year}`;
}
