import React, { useState } from "react";

interface ChatInputProps {
  loading: boolean;
  onSend: (message: string) => void;
  onCancel: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
  loading,
  onSend,
  onCancel,
}) => {
  const [input, setInput] = useState("");

  return (
    <div className="fixed bottom-4 left-0 w-full flex justify-center z-50 px-4 md:ml-24">
      <div className="w-full max-w-5xl px-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSend(input);
            setInput("");
          }}
          className="flex gap-2 bg-gray-800 p-3 rounded-lg border border-gray-700"
        >
          <input
            type="text"
            className="flex-1 p-3 bg-gray-700 text-white rounded-md outline-none"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          {loading ? (
            <button
              type="button"
              onClick={onCancel}
              className="w-24 bg-red-600 hover:bg-red-900 transition-all px-4 py-2 rounded-md text-white font-semibold shadow-md"
            >
              <span className="inline-block transition-colors duration-150">Cancel</span>
            </button>
          ) : (
            <button
              type="submit"
              className="w-24 bg-blue-600 hover:bg-green-500 disabled:hover:bg-blue-600 transition-all px-4 py-2 rounded-md disabled:opacity-50 text-white font-semibold shadow-md"
              disabled={loading || input.trim().length === 0}
            >
              <span className="inline-block transition-colors duration-150">Send</span>
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

export default ChatInput; 