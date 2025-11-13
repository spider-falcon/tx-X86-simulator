"use client";

import { useX86Simulator } from "@/hooks/useX86Simulator";
import Header from "@/components/x86/Header";
import FileTabs from "@/components/x86/FileTabs";
import CodeEditor from "@/components/x86/CodeEditor";
import ControlPanel from "@/components/x86/ControlPanel";
import OutputConsole from "@/components/x86/OutputConsole";
import RegisterDisplay from "@/components/x86/RegisterDisplay";
import MemoryDisplay from "@/components/x86/MemoryDisplay";
import CallStack from "@/components/x86/CallStack";
import ExecutionHistory from "@/components/x86/ExecutionHistory";

export default function Home() {
  const simulator = useX86Simulator();

  return (
    <main className="bg-background min-h-screen text-foreground font-body p-2 sm:p-4 flex flex-col gap-4">
      <Header cycles={simulator.cycles} executionTime={simulator.executionTime} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Left Column */}
        <div className="flex flex-col gap-4 min-h-0">
          <FileTabs
            files={simulator.files}
            activeFile={simulator.activeFile}
            setActiveFile={simulator.setActiveFile}
          />
          <CodeEditor
            code={simulator.files.find(f => f.name === simulator.activeFile)?.code || ''}
            onCodeChange={(code) => simulator.updateCode(simulator.activeFile, code)}
            breakpoints={simulator.breakpoints}
            toggleBreakpoint={simulator.toggleBreakpoint}
            currentLine={simulator.currentLine}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <ControlPanel
                onStep={simulator.step}
                onRun={simulator.run}
                onReset={simulator.reset}
                isRunning={simulator.isRunning}
             />
             <OutputConsole output={simulator.output} />
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-4 min-h-0">
          <RegisterDisplay registers={simulator.registers} flags={simulator.flags} />
          <MemoryDisplay memory={simulator.memory} registers={simulator.registers} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
            <CallStack callStack={simulator.callStack} />
            <ExecutionHistory history={simulator.history} />
          </div>
        </div>
      </div>
    </main>
  );
}
