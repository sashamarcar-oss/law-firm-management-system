const Topbar = () => {
  return (
    <div className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
      <h1 className="text-xl font-semibold text-gray-800">
        Legal Management System
      </h1>

      <div className="flex items-center space-x-4">
        <button className="relative">
          🔔
          <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs px-2 rounded-full">
            3
          </span>
        </button>

        <div className="text-sm text-gray-600">
          Evans Muthomi
        </div>
      </div>
    </div>
  );
};

export default Topbar;