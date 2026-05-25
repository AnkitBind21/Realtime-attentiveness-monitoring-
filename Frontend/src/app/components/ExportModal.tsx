import { useState } from "react";
import axios from "axios";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Download, X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  onClose: () => void;
}

export function ExportModal({ onClose }: Props) {
  const [className, setClassName]   = useState("TYIT");
  const [teacher, setTeacher]       = useState("Sumit Sir");
  const [subject, setSubject]       = useState("Computer Networks");
  const [duration, setDuration]     = useState("1 Hour");
  const [loading, setLoading]       = useState(false);

  const handleExport = async (format: "pdf" | "csv") => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        format,
        class_name: className,
        teacher,
        subject,
        duration,
      });

      const res = await axios.get(
        `http://127.0.0.1:5000/export_report?${params.toString()}`,
        { responseType: "blob" }
      );

      // Trigger download
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `attention_report.${format}`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`${format.toUpperCase()} exported successfully!`);
      onClose();
    } catch (error) {
      toast.error("Export failed. Make sure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    // Backdrop
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">Export Report</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Fields */}
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Class</Label>
            <Input value={className} onChange={(e) => setClassName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Teacher Name</Label>
            <Input value={teacher} onChange={(e) => setTeacher(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Duration</Label>
            <Input value={duration} onChange={(e) => setDuration(e.target.value)} />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={() => handleExport("pdf")}
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 gap-2"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </Button>
          <Button
            onClick={() => handleExport("csv")}
            disabled={loading}
            variant="outline"
            className="flex-1 gap-2 border-blue-600 text-blue-600 hover:bg-blue-50"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>
    </div>
  );
}