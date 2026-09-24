export const CATEGORY_COLORS = {
  "Documents / Resume": {
    bg: "#00b4d8", // Bright electric cyan
    tailwindBg: "bg-[#00b4d8]",
    tailwindText: "text-[#00b4d8]",
    border: "border-[#00b4d8]",
    label: "Documents / Resume"
  },
  "College / Assignments / Notes": {
    bg: "#8b5cf6", // Vibrant electric violet
    tailwindBg: "bg-[#8b5cf6]",
    tailwindText: "text-[#8b5cf6]",
    border: "border-[#8b5cf6]",
    label: "College / Notes"
  },
  "Certificates / Offers": {
    bg: "#06d6a0", // Bright neon mint
    tailwindBg: "bg-[#06d6a0]",
    tailwindText: "text-[#06d6a0]",
    border: "border-[#06d6a0]",
    label: "Certificates / Offers"
  },
  "Images / Screenshots": {
    bg: "#10b981", // Vivid emerald
    tailwindBg: "bg-[#10b981]",
    tailwindText: "text-[#10b981]",
    border: "border-[#10b981]",
    label: "Images & Screenshots"
  },
  "Media": {
    bg: "#d946ef", // Vibrant neon magenta
    tailwindBg: "bg-[#d946ef]",
    tailwindText: "text-[#d946ef]",
    border: "border-[#d946ef]",
    label: "Media (Audio/Video)"
  },
  "Installers / Archives": {
    bg: "#f97316", // Bright electric orange
    tailwindBg: "bg-[#f97316]",
    tailwindText: "text-[#f97316]",
    border: "border-[#f97316]",
    label: "Installers & Archives"
  },
  "Code / Projects": {
    bg: "#3b82f6", // Vivid royal blue
    tailwindBg: "bg-[#3b82f6]",
    tailwindText: "text-[#3b82f6]",
    border: "border-[#3b82f6]",
    label: "Code & Projects"
  },
  "Finance / Bills": {
    bg: "#eab308", // Bright electric gold
    tailwindBg: "bg-[#eab308]",
    tailwindText: "text-[#eab308]",
    border: "border-[#eab308]",
    label: "Finance & Bills"
  },
  "Private / Sensitive": {
    bg: "#ff0055", // Laser neon red
    tailwindBg: "bg-[#ff0055]",
    tailwindText: "text-[#ff0055]",
    border: "border-[#ff0055]",
    label: "Private / Sensitive"
  },
  "Others": {
    bg: "#64748b", // Bright slate
    tailwindBg: "bg-[#64748b]",
    tailwindText: "text-[#64748b]",
    border: "border-[#64748b]",
    label: "Others"
  }
};

export function getCategoryColor(category) {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS["Others"];
}

export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
