import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { Palette } from "lucide-react";

export function ThemeSelector() {
  const { theme, setTheme, isDarkMode, toggleDarkMode } = useTheme();
  
  const themes = [
    { 
      id: "default" as const, 
      name: "Bia Manh Beo", 
      description: "Giao diện gốc với vàng/đen",
      colors: ["#f59e0b", "#000000", "#ffffff"]
    },
    { 
      id: "business" as const, 
      name: "Business", 
      description: "Giao diện cyan/trắng chuyên nghiệp",
      colors: ["#00adc9", "#ffffff", "#f0f0f0"]
    },
    { 
      id: "lumina" as const, 
      name: "Lumina POS", 
      description: "Material Design 3 với Epilogue & Work Sans",
      colors: ["#8c5000", "#ff9500", "#f8f9fa"]
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Palette className="w-5 h-5 text-amber-500" />
        <h3 className="text-lg font-bold">Chọn Giao Diện</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {themes.map((t) => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={cn(
              "relative p-4 rounded-xl border-2 transition-all duration-300 text-left",
              theme === t.id
                ? "border-amber-500 shadow-lg scale-[1.02]"
                : "border-border hover:border-amber-300 hover:shadow-md"
            )}
          >
            {theme === t.id && (
              <div className="absolute top-2 right-2 w-3 h-3 bg-amber-500 rounded-full" />
            )}
            
            {/* Color preview */}
            <div className="flex gap-1 mb-3">
              {t.colors.map((color, idx) => (
                <div
                  key={idx}
                  className="w-8 h-8 rounded-lg shadow-sm"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            
            <h4 className="font-bold text-sm mb-1">{t.name}</h4>
            <p className="text-xs text-muted-foreground">{t.description}</p>
            
            {theme === t.id && (
              <div className="mt-2 text-xs font-bold text-amber-600">
                Đang sử dụng
              </div>
            )}
          </button>
        ))}
      </div>
      
      {/* Dark mode toggle for Lumina */}
      {theme === "lumina" && (
        <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl">
          <div>
            <h4 className="font-bold text-sm">Dark Mode (Lumina)</h4>
            <p className="text-xs text-muted-foreground">Bật giao diện tối cho Lumina</p>
          </div>
          <button
            onClick={toggleDarkMode}
            className={cn(
              "relative w-12 h-6 rounded-full transition-colors duration-300",
              isDarkMode ? "bg-amber-500" : "bg-gray-300"
            )}
          >
            <div
              className={cn(
                "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300",
                isDarkMode ? "translate-x-6" : "translate-x-0.5"
              )}
            />
          </button>
        </div>
      )}
    </div>
  );
}
