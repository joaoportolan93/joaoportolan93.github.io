import { motion } from 'framer-motion'
import { Github, Linkedin, Download, MapPin } from 'lucide-react'

export default function Hero() {
  return (
    <section className="min-h-screen flex items-center justify-center px-6 py-20">
      <motion.div
        className="max-w-2xl w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div className="flex items-center gap-2 mb-6 text-sm text-golf-brown/60">
          <MapPin size={14} aria-hidden="true" />
          <span>Paraná, Brasil · Remoto</span>
        </div>

        <h1 className="text-5xl md:text-6xl font-bold text-golf-brown mb-4 leading-tight">
          João Portolan
        </h1>

        <p className="text-xl md:text-2xl text-golf-brown/70 mb-6 font-medium">
          Desenvolvedor Frontend &amp; UI/UX Designer
        </p>

        <p className="text-lg text-golf-brown/80 mb-10 leading-relaxed max-w-lg">
          Construo interfaces que convertem. React, TypeScript e design centrado no usuário.
        </p>

        <div className="flex flex-wrap gap-4">
          <a
            href="https://github.com/joaoportolan93"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub de João Portolan"
            className="inline-flex items-center gap-2 px-5 py-3 bg-golf-brown text-golf-cream rounded-lg font-medium transition-all duration-200 hover:bg-golf-brown/80"
          >
            <Github size={18} aria-hidden="true" />
            GitHub
          </a>

          <a
            href="https://linkedin.com/in/joaoportolan"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn de João Portolan"
            className="inline-flex items-center gap-2 px-5 py-3 border-2 border-golf-brown text-golf-brown rounded-lg font-medium transition-all duration-200 hover:bg-golf-blue/30"
          >
            <Linkedin size={18} aria-hidden="true" />
            LinkedIn
          </a>

          <a
            href="/cv.pdf"
            download
            aria-label="Download do CV de João Portolan"
            className="inline-flex items-center gap-2 px-5 py-3 border-2 border-golf-pink text-golf-brown rounded-lg font-medium transition-all duration-200 hover:bg-golf-pink/40"
          >
            <Download size={18} aria-hidden="true" />
            Download CV
          </a>
        </div>
      </motion.div>
    </section>
  )
}
