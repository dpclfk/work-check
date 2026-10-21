/** window.confirm(취소/확인 2분기)으로는 못 나타내는 3지선다 확인창 —
 * 앱의 Alert.alert 3버튼(취소/분리/함께삭제) 패턴과 동일한 용도로 씀.
 * 백드롭 클릭 시 닫히는 동작은 Dropdown/Gnb의 Modal 패턴과 통일감 있게 맞춤 */
export interface ConfirmDialogAction {
  label: string;
  onClick: () => void;
  variant?: 'neutral' | 'danger';
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  actions: ConfirmDialogAction[];
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, actions, onCancel }: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-lg bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-2 text-base font-bold text-gray-900">{title}</h2>
        <p className="mb-4 text-sm text-gray-600">{message}</p>
        <div className="flex flex-col gap-2">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className={`rounded-lg px-3 py-2 text-sm font-medium hover:cursor-pointer ${
                action.variant === 'danger'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
