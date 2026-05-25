import { useState, useEffect } from "react";
import { Navbar } from "../components/Navbar";
import { AttentionChart } from "../components/AttentionChart";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Users, Eye, EyeOff, Activity } from "lucide-react";
import axios from "axios";

export function Dashboard() {
  const [stats, setStats] = useState({
    totalStudents: 1,
    currentAttentive: 0,
    currentInattentive: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get("http://127.0.0.1:5000/attention_logs");
        const now = new Date();
        const recentData = res.data.filter((d: any) => {
          const t = new Date(d.timestamp);
          if (isNaN(t.getTime())) return false;
          return now.getTime() - t.getTime() <= 5000; // last 5 seconds
        });

        if (recentData.length > 0) {
          const latest = recentData[recentData.length - 1];
          setStats({
            totalStudents: 1,
            currentAttentive: latest.status === "attentive" ? 1 : 0,
            currentInattentive: latest.status === "attentive" ? 0 : 1,
          });
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 2000);
    return () => clearInterval(interval);
  }, []);

  const statsCards = [
    {
      title: "Total Students",
      value: stats.totalStudents,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-l-blue-500",
    },
    {
      title: "Currently Attentive",
      value: stats.currentAttentive,
      icon: Eye,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-l-green-500",
    },
    {
      title: "Currently Inattentive",
      value: stats.currentInattentive,
      icon: EyeOff,
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-l-red-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">
            Monitor student attentiveness in real-time and analyze attention patterns
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {statsCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card
                key={index}
                className={`border-l-4 ${stat.borderColor} shadow-md hover:shadow-lg transition-shadow`}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">
                    {stat.value}
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                    <Activity className="w-3 h-3" />
                    Live
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <AttentionChart />

        <Card className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Real-time Monitoring Active</h3>
                <p className="text-blue-100 text-sm">
                  The system is continuously tracking student attention levels and updating metrics every 2 seconds
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
