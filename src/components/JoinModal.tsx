import React, { useState } from "react";

interface JoinModalProps {
  onJoin: (code: string) => Promise<void>;
  onClose: () => void;
}

const JoinModal: React.FC<JoinModalProps> = ({ onJoin, onClose }) => {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onJoin(code.trim());
      onClose(); // Close on success
    } catch (err: any) {
      // You can customize error handling based on your handleJoin implementation
      setError(err?.message || "Failed to join. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/30">
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-white w-80 text-center border border-gray-600">
        <h2 className="text-xl font-semibold mb-4">Join a Room</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            className="w-full p-3 rounded bg-gray-700 text-white outline-none text-center"
            placeholder="Enter invite code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={loading}
            autoFocus
          />
          {error && <div className="text-red-400 text-sm">{error}</div>}
          <div className="flex gap-2">
            <button
              type="submit"
              className="w-1/2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white disabled:opacity-50"
              disabled={loading || !code.trim()}
            >
              {loading ? "Joining..." : "Join"}
            </button>
            <button
              type="button"
              className="w-1/2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-transform active:scale-95"
              onClick={onClose}
              disabled={loading}
            >
              Close
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JoinModal;