import { Github, Linkedin, Mail } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="px-6 py-12 border-t border-golf-brown/10">
      <div className="max-w-4xl mx-auto">
        <div className="h-px w-full mb-8 rounded-full bg-gradient-to-r from-golf-pink via-golf-blue to-golf-green opacity-60" aria-hidden="true" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-golf-brown/60">© 2026 João Portolan</p>

          <nav aria-label="Links de contato">
            <ul className="flex items-center gap-5">
              <li>
                <a
                  href="https://github.com/joaoportolan93"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub"
                  className="text-golf-brown/50 hover:text-golf-brown transition-colors duration-200"
                >
                  <Github size={20} aria-hidden="true" />
                </a>
              </li>
              <li>
                <a
                  href="https://linkedin.com/in/joaoportolan"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                  className="text-golf-brown/50 hover:text-golf-brown transition-colors duration-200"
                >
                  <Linkedin size={20} aria-hidden="true" />
                </a>
              </li>
              <li>
                <a
                  href="mailto:contato@joaoportolan.me"
                  aria-label="Email"
                  className="text-golf-brown/50 hover:text-golf-brown transition-colors duration-200"
                >
                  <Mail size={20} aria-hidden="true" />
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  )
}
