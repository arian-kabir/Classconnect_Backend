
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans relative overflow-x-hidden selection:bg-primary-container selection:text-primary">
      {/* Subtle Background Grid Pattern */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40" 
        style={{
          backgroundImage: `radial-gradient(var(--outline-variant) 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />

      {/* Header */}
      <header className="relative w-full max-w-7xl mx-auto px-6 h-20 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          {/* Logo Icon */}
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" />
            <div className="flex flex-col gap-1">
              <span className="w-2.5 h-1.5 rounded-full bg-primary" />
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            </div>
          </div>
          <span className="text-xl font-bold tracking-tight text-primary">ClassConnect</span>
        </div>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors">Features</a>
          <a href="#about" className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors">About</a>
          <a href="#pricing" className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors">Pricing</a>
        </nav>

        {/* CTA Buttons */}
        <div className="flex items-center gap-4">
          <a href="/auth/login" className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors px-3 py-2">Login</a>
          <a href="/auth/signup" className="text-sm font-semibold bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container transition-all px-4 py-2 rounded-md shadow-sm">
            Sign Up
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative w-full max-w-7xl mx-auto px-6 pt-12 pb-24 md:pt-20 md:pb-32 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center z-10">
        {/* Left Column: Content */}
        <div className="lg:col-span-5 flex flex-col items-start text-left gap-6">
          {/* Active Term Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary-container text-on-secondary-container text-xs font-bold tracking-wider uppercase border border-outline-variant/30 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Now Available for Fall Semester
          </div>

          {/* Heading */}
          <h1 className="text-display text-primary leading-[1.1] tracking-tight">
            The Unified Pulse of <span className="text-surface-tint">University Life</span>
          </h1>

          {/* Subtitle */}
          <p className="text-body-lg text-on-surface-variant max-w-lg leading-relaxed">
            Consolidate fragmented course materials, disjointed communications, and scheduling chaos into a single, intelligent academic hub.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 pt-2 w-full sm:w-auto">
            <a 
              href="/auth/signup" 
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 text-sm font-semibold bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container transition-all px-6 py-3.5 rounded-md shadow-interactive group"
            >
              Get Started for Free
              <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </a>
            
            <a 
              href="#watch-demo" 
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 text-sm font-semibold bg-surface-container hover:bg-surface-container-high text-on-surface transition-all px-6 py-3.5 rounded-md border border-outline-variant/50"
            >
              <svg className="w-4.5 h-4.5 text-surface-tint" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Watch Demo
            </a>
          </div>

          {/* Social Proof */}
          <div className="flex items-center gap-3 pt-6 border-t border-outline-variant/30 w-full">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-primary-fixed border-2 border-white flex items-center justify-center text-[10px] font-bold text-on-primary-fixed">S</div>
              <div className="w-8 h-8 rounded-full bg-secondary-fixed border-2 border-white flex items-center justify-center text-[10px] font-bold text-on-secondary-fixed">L</div>
              <div className="w-8 h-8 rounded-full bg-tertiary-fixed border-2 border-white flex items-center justify-center text-[10px] font-bold text-on-tertiary-fixed">A</div>
              <div className="w-8 h-8 rounded-full bg-surface-container-highest border-2 border-white flex items-center justify-center text-[10px] font-bold text-on-surface-variant">+2k</div>
            </div>
            <span className="text-xs font-medium text-on-surface-variant">Trusted by students & faculty</span>
          </div>
        </div>

        {/* Right Column: Interactive Browser Preview */}
        <div className="lg:col-span-7 flex justify-center lg:justify-end">
          <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-interactive border border-outline-variant/50 overflow-hidden transform hover:-translate-y-1 transition-all duration-300">
            {/* Browser Header Bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-surface-container-low border-b border-outline-variant/30">
              {/* Window Controls */}
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
              </div>
              {/* Address Input */}
              <div className="bg-white px-10 py-1 rounded-md text-xs text-on-surface-variant border border-outline-variant/30 font-medium tracking-wide">
                classconnect.edu
              </div>
              {/* Empty offset for balance */}
              <div className="w-12" />
            </div>

            {/* Browser Content Window showing the actual dashboard screenshot */}
            <div className="relative bg-surface aspect-[4/3] overflow-hidden">
              <Image 
                src="/image.png" 
                alt="ClassConnect Dashboard Mockup" 
                fill 
                className="object-cover object-right"
                priority
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
