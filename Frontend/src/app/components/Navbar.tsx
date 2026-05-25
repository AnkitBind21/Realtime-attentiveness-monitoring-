import { useNavigate, useLocation } from "react-router";
import { Button } from "./ui/button";
import { GraduationCap, LogOut, LayoutDashboard, Video } from "lucide-react";

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const logout = () => {
    navigate("/");
  };

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Classroom Attentiveness
              </h1>
              <p className="text-xs text-gray-500">Real-time Monitoring System</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {location.pathname === "/dashboard" && (
              <Button
                variant="outline"
                onClick={() => navigate("/live")}
                className="gap-2"
              >
                <Video className="w-4 h-4" />
                Live Monitor
              </Button>
            )}
            {location.pathname === "/live" && (
              <Button
                variant="outline"
                onClick={() => navigate("/dashboard")}
                className="gap-2"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Button>
            )}
            <Button
              variant="destructive"
              onClick={logout}
              className="gap-2 bg-red-500 hover:bg-red-600"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
