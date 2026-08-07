import { GameCanvas } from "@/components/GameCanvas";
import { TopBar } from "@/components/TopBar";
import { UpgradePanel } from "@/components/UpgradePanel";

/**
 * Página principal: duas camadas (z-index)
 * - Background: canvas da arena
 * - Foreground: UI flutuante (TopBar + UpgradePanel)
 */
export default function Home() {
  return (
    <div className="relative h-dvh w-full overflow-hidden bg-zinc-950">
      {/* Camada do jogo */}
      <GameCanvas />

      {/* Camada da interface */}
      <div className="pointer-events-none absolute inset-0 z-10">
        <TopBar />
        <UpgradePanel />
      </div>
    </div>
  );
}
