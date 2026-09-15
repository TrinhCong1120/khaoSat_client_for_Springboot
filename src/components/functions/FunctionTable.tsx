import React from "react";

const FunctionTable = ({ functions, onPermission }: any) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
        
        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400">
          <tr>
            <th className="px-6 py-3">ID</th>
            <th className="px-6 py-3">Tên chức năng</th>
            <th className="px-6 py-3">Mã</th>
            <th className="px-6 py-3 text-right">Hành động</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
          {functions.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-6 py-4 text-center">
                Không tìm thấy chức năng nào.
              </td>
            </tr>
          ) : (
            functions.map((f: any) => (
              <tr
                key={f.id}
                className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">
                  {f.id}
                </td>
                <td className="px-6 py-4">
                  {f.name}
                </td>

                <td className="px-6 py-4">
                  <span className="px-2 py-1 text-xs font-medium rounded bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
                    {f.code}
                  </span>
                </td>

                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => onPermission(f.id)}
                    className="px-4 py-1.5 text-sm font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors shadow-sm"
                  >
                    Phân quyền
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default FunctionTable;