interface FooterProps {
  connected: boolean;
}

export default function Footer({ connected }: FooterProps) {
  return (
    <footer className="bg-white border-t border-gray-200 py-4">
      <div className="container mx-auto px-4 text-center text-sm text-gray-500">
        <p>
          © {new Date().getFullYear()} Store Traffic Dashboard | 
          <span className={connected ? "text-primary ml-1" : "text-error ml-1"}>
            {connected ? "WebSocket Connected" : "WebSocket Disconnected"}
          </span>
        </p>
      </div>
    </footer>
  );
}
