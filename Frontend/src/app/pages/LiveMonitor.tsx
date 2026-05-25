import { useEffect } from "react";
import { Navbar } from "../components/Navbar";
import { AttentionChart } from "../components/AttentionChart";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Video, Radio } from "lucide-react";

export function LiveMonitor() {
  useEffect(() => {
    return () => {
      const img = document.getElementById("liveFeed") as HTMLImageElement;
      if (img) img.src = "";
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">Live Classroom Monitoring</h1>
            <p className="text-gray-600">
              Real-time video feed with attention analysis
            </p>
          </div>
          <Badge className="bg-red-500 hover:bg-red-500 text-white px-4 py-2 text-sm gap-2 animate-pulse">
            <Radio className="w-4 h-4" />
            LIVE
          </Badge>
        </div>

        <Card className="shadow-lg border-gray-200">
          <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center gap-2">
              <Video className="w-5 h-5 text-blue-600" />
              <CardTitle>Live Video Feed</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="relative rounded-xl overflow-hidden bg-black shadow-2xl">
              <img
                id="liveFeed"
                src="http://127.0.0.1:5000/video_feed"
                alt="Live Classroom Feed"
                className="w-full h-auto"
              />
              <div className="absolute top-4 left-4">
                <Badge className="bg-red-500/90 backdrop-blur-sm hover:bg-red-500 text-white px-3 py-1.5 gap-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  LIVE STREAM
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <AttentionChart />

        <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-indigo-100 text-sm mb-1">Detection Rate</p>
                <p className="text-2xl font-bold">Real-time</p>
              </div>
              <div>
                <p className="text-indigo-100 text-sm mb-1">Update Interval</p>
                <p className="text-2xl font-bold">2 seconds</p>
              </div>
              <div>
                <p className="text-indigo-100 text-sm mb-1">Analysis Window</p>
                <p className="text-2xl font-bold">60 seconds</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
