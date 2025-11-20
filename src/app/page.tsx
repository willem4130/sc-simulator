export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#667eea] to-[#764ba2] text-white">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
          Simplicate <span className="text-[hsl(280,100%,70%)]">Automations</span>
        </h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-8">
          <div className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-4 hover:bg-white/20">
            <h3 className="text-2xl font-bold">📋 Contract Distribution</h3>
            <div className="text-lg">
              Automatically send contracts to team members on new projects
            </div>
          </div>
          <div className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-4 hover:bg-white/20">
            <h3 className="text-2xl font-bold">⏰ Hours Reminders</h3>
            <div className="text-lg">
              Smart reminders for team members to submit their hours
            </div>
          </div>
          <div className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-4 hover:bg-white/20">
            <h3 className="text-2xl font-bold">💰 Invoice Generation</h3>
            <div className="text-lg">
              Automatic invoice creation based on approved hours
            </div>
          </div>
          <div className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-4 hover:bg-white/20">
            <h3 className="text-2xl font-bold">🔔 Multi-Channel Notifications</h3>
            <div className="text-lg">
              Email, Slack, and in-app notifications with user preferences
            </div>
          </div>
        </div>
        <div className="text-center">
          <p className="text-xl text-white/80">
            Production-ready automation system for Simplicate
          </p>
          <p className="mt-2 text-sm text-white/60">
            See QUICK_START.md to get started
          </p>
        </div>
      </div>
    </main>
  )
}
