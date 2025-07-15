const InviteModal = ({ code, onClose }: { code: string; onClose: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/30">
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-white w-80 text-center border border-gray-600">
      <h2 className="text-xl font-semibold mb-4">Invite Code</h2>
      <p className="text-3xl font-mono mb-6 tracking-widest">{code}</p>
      <button
        onClick={onClose}
        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-transform active:scale-95"
      >
        Close
      </button>
    </div>
  </div>
);

export default InviteModal;
