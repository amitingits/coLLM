import React, { useRef, useState } from "react";

interface JoinModalProps {
  onJoin: (code: string) => Promise<void>;
  onClose: () => void;
}

const BOX_COUNT = 6;

const JoinModal: React.FC<JoinModalProps> = ({ onJoin, onClose }) => {
  const [codeArr, setCodeArr] = useState<string[]>(Array(BOX_COUNT).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const handleChange = (idx: number, val: string) => {
    if (!/^[A-Za-z0-9]?$/.test(val)) return;
    const newArr = [...codeArr];
    newArr[idx] = val.toUpperCase();
    setCodeArr(newArr);
    if (val && idx < BOX_COUNT - 1) {
      inputsRef.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !codeArr[idx] && idx > 0) {
      const newArr = [...codeArr];
      newArr[idx - 1] = "";
      setCodeArr(newArr);
      inputsRef.current[idx - 1]?.focus();
      e.preventDefault();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const paste = e.clipboardData.getData("text").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    if (paste.length === BOX_COUNT) {
      setCodeArr(paste.split(""));
      inputsRef.current[BOX_COUNT - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onJoin(codeArr.join(""));
      onClose(); // Close on success
    } catch (err: any) {
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
          <div className="flex justify-center gap-2 mb-2">
            {codeArr.map((char, idx) => (
              <input
                key={idx}
                ref={el => { inputsRef.current[idx] = el; }}
                type="text"
                inputMode="text"
                maxLength={1}
                className="w-10 h-12 text-2xl text-center bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={char}
                onChange={e => handleChange(idx, e.target.value)}
                onKeyDown={e => handleKeyDown(idx, e)}
                onPaste={handlePaste}
                autoFocus={idx === 0}
              />
            ))}
          </div>
          {error && <div className="text-red-400 text-sm">{error}</div>}
          <div className="flex gap-3 mt-6">
            <button
              type="submit"
              className="w-1/2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white disabled:opacity-50"
              disabled={loading || codeArr.some(c => !c)}
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