import { useEffect, useState, useRef } from "react";

import axios from "axios";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import jsPDF from "jspdf";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Download, TrendingUp, Activity } from "lucide-react";
import { ExportModal } from "./ExportModal";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler
);

// Student Info 

const STUDENT_NAME = "Ankit Bind";
const STUDENT_ROLL_NO = "T006";

export function AttentionChart() {
  const [data, setData] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState("");
  const chartRef = useRef<any>(null);

  const [showExportModal, setShowExportModal] = useState(false);

  //Graph PDF Export 
  const exportGraphPDF = () => {
    if (!chartRef.current || !data) return;

    const pdf = new jsPDF("p", "mm", "a4");
    const pageW = 210;
    const margin = 14;
    const contentW = pageW - margin * 2;
    let y = 0;

    //Helpers 

    const hex2rgb = (hex: string): [number, number, number] => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return [r, g, b];
    };
    const setFill = (hex: string) => pdf.setFillColor(...hex2rgb(hex));
    const setDraw = (hex: string) => pdf.setDrawColor(...hex2rgb(hex));
    const setTextColor = (hex: string) => pdf.setTextColor(...hex2rgb(hex));

    // Stats 

    const values: number[] = data.datasets[0].data;
    const totalFrames = values.length;
    const attentiveCount = values.filter((v) => v === 100).length;
    const inattentiveCount = totalFrames - attentiveCount;
    const avgAttention =
      totalFrames > 0 ? Math.round((attentiveCount / totalFrames) * 100) : 0;

    // SECTION 1 — Header Banner

    setFill("#1e40af");
    pdf.rect(0, 0, pageW, 28, "F");

    setFill("#3b82f6");
    pdf.rect(0, 22, pageW, 6, "F");

    setTextColor("#ffffff");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text("Attention Analysis Report", pageW / 2, 13, { align: "center" });

    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.text("Classroom Monitoring System", pageW / 2, 20, { align: "center" });

    y = 35;
 
    // SECTION 2 — Student Info Card

    setFill("#f8fafc");
    setDraw("#e2e8f0");
    pdf.setLineWidth(0.3);
    pdf.roundedRect(margin, y, contentW, 22, 2, 2, "FD");

    // Left accent bar
    setFill("#1e40af");
    pdf.rect(margin, y, 3, 22, "F");

    // Label + Value: Student Name
    setTextColor("#64748b");
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.text("STUDENT NAME", margin + 8, y + 8);

    setTextColor("#0f172a");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text(STUDENT_NAME, margin + 8, y + 16);

    // Divider between columns
    setDraw("#e2e8f0");
    pdf.setLineWidth(0.3);
    pdf.line(pageW / 2, y + 4, pageW / 2, y + 18);

    // Label + Value: Roll No
    setTextColor("#64748b");
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.text("ROLL NUMBER", pageW / 2 + 8, y + 8);

    setTextColor("#0f172a");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text(STUDENT_ROLL_NO, pageW / 2 + 8, y + 16);

    y += 29;

    // SECTION 3 — Stats Cards
  
    const stats = [
      { label: "Avg Attention", value: `${avgAttention}%`, color: "#1e40af", bg: "#dbeafe" },
      { label: "Total Frames", value: `${totalFrames}`, color: "#065f46", bg: "#d1fae5" },
      { label: "Attentive", value: `${attentiveCount}`, color: "#166534", bg: "#bbf7d0" },
      { label: "Inattentive", value: `${inattentiveCount}`, color: "#991b1b", bg: "#fee2e2" },
    ];

    const cardW = (contentW - 9) / 4;

    stats.forEach((stat, i) => {
      const cx = margin + i * (cardW + 3);
      setFill(stat.bg);
      setDraw("#e2e8f0");
      pdf.setLineWidth(0.2);
      pdf.roundedRect(cx, y, cardW, 20, 2, 2, "FD");

      setTextColor(stat.color);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.text(stat.value, cx + cardW / 2, y + 12, { align: "center" });

      pdf.setFontSize(6.5);
      pdf.setFont("helvetica", "normal");
      pdf.text(stat.label.toUpperCase(), cx + cardW / 2, y + 18, { align: "center" });
    });

    y += 27;

    // SECTION 4 — Charts Row 


    const chartRowH = 60;
    const halfW = contentW / 2 - 3;

    // Pie Chart

    setFill("#f8fafc");
    setDraw("#e2e8f0");
    pdf.setLineWidth(0.3);
    pdf.roundedRect(margin, y, halfW, chartRowH, 2, 2, "FD");

    setTextColor("#1e40af");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.text("Attention Distribution", margin + halfW / 2, y + 7, { align: "center" });

    const pieCanvas = document.createElement("canvas");
    pieCanvas.width = 200;
    pieCanvas.height = 200;
    const pieCtx = pieCanvas.getContext("2d")!;

    const pcx = 100, pcy = 100, pr = 80;
    const attAngle = (attentiveCount / (totalFrames || 1)) * 2 * Math.PI;

    pieCtx.beginPath();
    pieCtx.moveTo(pcx, pcy);
    pieCtx.arc(pcx, pcy, pr, -Math.PI / 2, -Math.PI / 2 + attAngle);
    pieCtx.closePath();
    pieCtx.fillStyle = "#22c55e";
    pieCtx.fill();

    pieCtx.beginPath();
    pieCtx.moveTo(pcx, pcy);
    pieCtx.arc(pcx, pcy, pr, -Math.PI / 2 + attAngle, -Math.PI / 2 + 2 * Math.PI);
    pieCtx.closePath();
    pieCtx.fillStyle = "#ef4444";
    pieCtx.fill();

    // Donut hole
    pieCtx.beginPath();
    pieCtx.arc(pcx, pcy, pr * 0.45, 0, 2 * Math.PI);
    pieCtx.fillStyle = "#f8fafc";
    pieCtx.fill();

    pieCtx.fillStyle = "#1e293b";
    pieCtx.font = "bold 28px sans-serif";
    pieCtx.textAlign = "center";
    pieCtx.textBaseline = "middle";
    pieCtx.fillText(`${avgAttention}%`, pcx, pcy);

    const pieImg = pieCanvas.toDataURL("image/png");
    const pieSize = chartRowH - 18;
    pdf.addImage(pieImg, "PNG", margin + 4, y + 10, pieSize, pieSize);

    const lx = margin + pieSize + 8;
    const legendItems = [
      { color: "#22c55e", label: `Attentive ${avgAttention}%` },
      { color: "#ef4444", label: `Inattentive ${100 - avgAttention}%` },
    ];
    legendItems.forEach(({ color, label }, i) => {
      setFill(color);
      pdf.roundedRect(lx, y + 18 + i * 12, 5, 4, 1, 1, "F");
      setTextColor("#374151");
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      pdf.text(label, lx + 7, y + 21 + i * 12);
    });

    // Bar Chart 

    const bx = margin + halfW + 6;
    setFill("#f8fafc");
    setDraw("#e2e8f0");
    pdf.roundedRect(bx, y, halfW, chartRowH, 2, 2, "FD");

    setTextColor("#1e40af");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.text("Attentive vs Inattentive", bx + halfW / 2, y + 7, { align: "center" });

    const barCanvas = document.createElement("canvas");
    barCanvas.width = 300;
    barCanvas.height = 200;
    const bCtx = barCanvas.getContext("2d")!;

    const maxVal = Math.max(attentiveCount, inattentiveCount, 1);
    const barData = [
      { label: "Attentive", value: attentiveCount, color: "#22c55e" },
      { label: "Inattentive", value: inattentiveCount, color: "#ef4444" },
    ];
    const barW = 80, gap = 60, startX = 40, chartH = 140, baseY = 170;

    bCtx.strokeStyle = "#e2e8f0";
    bCtx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const gy = baseY - (i / 4) * chartH;
      bCtx.beginPath();
      bCtx.moveTo(20, gy);
      bCtx.lineTo(280, gy);
      bCtx.stroke();
      bCtx.fillStyle = "#94a3b8";
      bCtx.font = "14px sans-serif";
      bCtx.textAlign = "right";
      bCtx.fillText(String(Math.round((i / 4) * maxVal)), 18, gy + 5);
    }

    barData.forEach(({ label, value, color }, i) => {
      const bh = (value / maxVal) * chartH;
      const bxc = startX + i * (barW + gap);
      const gradient = bCtx.createLinearGradient(0, baseY - bh, 0, baseY);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, color + "99");
      bCtx.fillStyle = gradient;
      bCtx.beginPath();
      const radius = 6;
      bCtx.moveTo(bxc + radius, baseY - bh);
      bCtx.lineTo(bxc + barW - radius, baseY - bh);
      bCtx.arcTo(bxc + barW, baseY - bh, bxc + barW, baseY - bh + radius, radius);
      bCtx.lineTo(bxc + barW, baseY);
      bCtx.lineTo(bxc, baseY);
      bCtx.lineTo(bxc, baseY - bh + radius);
      bCtx.arcTo(bxc, baseY - bh, bxc + radius, baseY - bh, radius);
      bCtx.closePath();
      bCtx.fill();

      bCtx.fillStyle = "#fff";
      bCtx.font = "bold 18px sans-serif";
      bCtx.textAlign = "center";
      bCtx.fillText(String(value), bxc + barW / 2, baseY - bh + 20);

      bCtx.fillStyle = "#374151";
      bCtx.font = "14px sans-serif";
      bCtx.fillText(label, bxc + barW / 2, baseY + 20);
    });

    const barImg = barCanvas.toDataURL("image/png");
    pdf.addImage(barImg, "PNG", bx + 2, y + 9, halfW - 4, chartRowH - 12);

    y += chartRowH + 7;

    
    // SECTION 5 — Line Graph

    setFill("#f8fafc");
    setDraw("#e2e8f0");
    pdf.setLineWidth(0.3);
    pdf.roundedRect(margin, y, contentW, 62, 2, 2, "FD");

    setTextColor("#1e40af");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.text("Real-Time Attention Timeline", margin + contentW / 2, y + 7, { align: "center" });

    const chart = chartRef.current;
    const lineImg = chart.toBase64Image();

    const origW = chart.width;
    const origH = chart.height;
    const maxImgW = contentW - 8;
    const imgH = Math.min((origH / origW) * maxImgW, 50);
    const imgW = (origW / origH) * imgH;
    const imgX = margin + (contentW - imgW) / 2;

    pdf.addImage(lineImg, "PNG", imgX, y + 10, imgW, imgH);

    y += 70;

    // SECTION 6 — Insight

    let insightText: string;
    let insightColor: string;
    let insightBg: string;
    let insightIcon: string;

    if (avgAttention >= 75) {
      insightText =
        "Excellent attention level maintained throughout the session. Student was consistently focused.";
      insightColor = "#065f46";
      insightBg = "#d1fae5";
      insightIcon = "✓ Excellent";
    } else if (avgAttention >= 40) {
      insightText =
        "Moderate attention with fluctuations observed. Some periods of distraction were detected.";
      insightColor = "#92400e";
      insightBg = "#fef3c7";
      insightIcon = "~ Moderate";
    } else {
      insightText =
        "Low attention detected. Significant inattention recorded. Intervention may be needed.";
      insightColor = "#991b1b";
      insightBg = "#fee2e2";
      insightIcon = "⚠ Needs Improvement";
    }

    setFill(insightBg);
    setDraw(insightColor + "55");
    pdf.setLineWidth(0.3);
    pdf.roundedRect(margin, y, contentW, 22, 2, 2, "FD");

    setFill(insightColor);
    pdf.rect(margin, y, 3, 22, "F");

    setTextColor(insightColor);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    pdf.text(insightIcon, margin + 7, y + 8);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    setTextColor("#374151");
    const wrapped = pdf.splitTextToSize(insightText, contentW - 12);
    pdf.text(wrapped, margin + 7, y + 15);

    y += 29;

    // Footer

    setFill("#1e40af");
    pdf.rect(0, 287, pageW, 10, "F");

    setTextColor("#bfdbfe");
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.text("Generated by Classroom Monitoring System", margin, 293);
    pdf.text(
      `${STUDENT_NAME}  |  Roll No: ${STUDENT_ROLL_NO}`,
      pageW - margin,
      293,
      { align: "right" }
    );

    pdf.save(`attention_report_${STUDENT_ROLL_NO}_${Date.now()}.pdf`);
  };

  const fetchData = async () => {
    try {
      const res = await axios.get("http://127.0.0.1:5000/attention_logs");
      const lastMinute = res.data;

      const labels = lastMinute.map((d: any) =>
        new Date(d.timestamp).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );

      const values = lastMinute.map((d: any) =>
        d.status === "attentive" ? 100 : 0
      );

      if (values.length === 0) {
        values.push(0);
        labels.push("No Data");
      }

      setData({
        labels: [...labels],
        datasets: [
          {
            label: "Attention Status",
            data: [...values],
            borderColor: "rgb(59,130,246)",
            backgroundColor: "rgba(59,130,246,0.15)",
            borderWidth: 3,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: "rgb(59,130,246)",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            fill: true,
          },
        ],
      });
    } catch (error) {
      console.error("Error fetching attention data:", error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString("en-IN"));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getPercentages = () => {
    if (!data || data.datasets[0].data.length === 0) {
      return { att: 0, inatt: 0 };
    }
    const values = data.datasets[0].data;
    const attCount = values.filter((v: number) => v === 100).length;
    const att = Math.round((attCount / values.length) * 100);
    return { att, inatt: 100 - att };
  };

  if (!data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[300px]">
          <div className="flex flex-col items-center gap-3">
            <Activity className="w-10 h-10 text-blue-500 animate-pulse" />
            <p className="text-gray-500">Loading attention data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { att, inatt } = getPercentages();

  return (
    <Card className="shadow-lg border-gray-200">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <CardTitle className="text-lg">Live Attention Graph</CardTitle>
            </div>
            <CardDescription>Real-time classroom monitoring</CardDescription>
          </div>

          <div className="flex gap-2">
            {/* Graph PDF Export */}
            <Button
              onClick={exportGraphPDF}
              size="sm"
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <Download className="w-4 h-4" />
              Graph PDF
            </Button>

            {/* Full Report Export */}
            <Button
              onClick={() => setShowExportModal(true)}
              size="sm"
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Download className="w-4 h-4" />
              Export Report
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="flex items-center justify-center gap-6 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
          <Badge className="bg-green-500 text-white px-4 py-2">
            Attentive: {att}%
          </Badge>
          <Badge className="bg-red-500 text-white px-4 py-2">
            Inattentive: {inatt}%
          </Badge>
          <Badge className="bg-blue-500 text-white px-4 py-2">
            Avg Attention: {att}%
          </Badge>
        </div>

        <p className="text-center text-sm text-gray-500">
          Current Time: {currentTime}
        </p>

        <div className="h-[240px] mt-4">
          <Line
            ref={chartRef}
            data={data}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              animation: { duration: 0 },
              plugins: {
                legend: { display: false },
              },
              scales: {
                y: {
                  min: 0,
                  max: 100,
                  ticks: {
                    callback: (v: any) => v + "%",
                  },
                },
                x: {
                  ticks: {
                    maxTicksLimit: 6,
                  },
                },
              },
            }}
          />
        </div>
      </CardContent>

      {showExportModal && (
        <ExportModal onClose={() => setShowExportModal(false)} />
      )}
    </Card>
  );
}
