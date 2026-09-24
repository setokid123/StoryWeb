import { Type, AlignLeft, AlignJustify, Monitor, Sun, Moon, RotateCcw, X, List, Hash } from "lucide-react";

export type FontFamily = "lora" | "inter";
export type FontWeight = "normal" | "bold";
export type TextAlignment = "left" | "justify";
export type ColumnWidth = "narrow" | "medium" | "wide";
export type LineHeight = "tight" | "normal" | "loose";
export type ThemePreference = "light" | "dark" | "system";

export type ReaderPreferences = {
  fontFamily: FontFamily;
  fontWeight: FontWeight;
  fontSize: number; // 16 to 26
  lineHeight: LineHeight;
  columnWidth: ColumnWidth;
  textAlignment: TextAlignment;
  theme: ThemePreference;
};

export type ReaderPreferencesViewProps = {
  preferences: ReaderPreferences;
  onUpdate: (updates: Partial<ReaderPreferences>) => void;
  onReset: () => void;
  onClose: () => void;
};

export function ReaderPreferencesView({ preferences, onUpdate, onReset, onClose }: ReaderPreferencesViewProps) {
  const p = preferences;

  return (
    <div className="reader-prefs-backdrop" onClick={onClose}>
    <div className="reader-prefs" role="dialog" onClick={e => e.stopPropagation()} aria-modal="true" aria-labelledby="prefs-title">
      <header className="reader-prefs__header">
        <h2 id="prefs-title">Tùy chỉnh đọc</h2>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Đóng tùy chỉnh">
          <X size={20} />
        </button>
      </header>

      <div className="reader-prefs__body">
        {/* Theme */}
        <section className="pref-section">
          <div className="pref-section__title">Nền và màu chữ</div>
          <div className="pref-segmented" role="group" aria-label="Chế độ nền">
            <button
              type="button"
              className={`pref-btn ${p.theme === 'light' ? 'is-active' : ''}`}
              onClick={() => onUpdate({ theme: 'light' })}
              aria-pressed={p.theme === 'light'}
            >
              <Sun size={18} /> Sáng
            </button>
            <button
              type="button"
              className={`pref-btn ${p.theme === 'dark' ? 'is-active' : ''}`}
              onClick={() => onUpdate({ theme: 'dark' })}
              aria-pressed={p.theme === 'dark'}
            >
              <Moon size={18} /> Tối
            </button>
            <button
              type="button"
              className={`pref-btn ${p.theme === 'system' ? 'is-active' : ''}`}
              onClick={() => onUpdate({ theme: 'system' })}
              aria-pressed={p.theme === 'system'}
            >
              <Monitor size={18} /> Hệ thống
            </button>
          </div>
        </section>

        {/* Font Family & Weight */}
        <section className="pref-section">
          <div className="pref-section__title">Kiểu chữ</div>
          <div className="pref-grid-2">
            <div className="pref-segmented" role="group" aria-label="Phông chữ">
              <button
                type="button"
                className={`pref-btn pref-btn--font-serif ${p.fontFamily === 'lora' ? 'is-active' : ''}`}
                onClick={() => onUpdate({ fontFamily: 'lora' })}
                aria-pressed={p.fontFamily === 'lora'}
              >
                Văn học
              </button>
              <button
                type="button"
                className={`pref-btn pref-btn--font-sans ${p.fontFamily === 'inter' ? 'is-active' : ''}`}
                onClick={() => onUpdate({ fontFamily: 'inter' })}
                aria-pressed={p.fontFamily === 'inter'}
              >
                Hiện đại
              </button>
            </div>
            <div className="pref-segmented" role="group" aria-label="Độ đậm">
              <button
                type="button"
                className={`pref-btn ${p.fontWeight === 'normal' ? 'is-active' : ''}`}
                onClick={() => onUpdate({ fontWeight: 'normal' })}
                aria-pressed={p.fontWeight === 'normal'}
                style={{ fontWeight: 'normal' }}
              >
                Thường
              </button>
              <button
                type="button"
                className={`pref-btn ${p.fontWeight === 'bold' ? 'is-active' : ''}`}
                onClick={() => onUpdate({ fontWeight: 'bold' })}
                aria-pressed={p.fontWeight === 'bold'}
                style={{ fontWeight: 'bold' }}
              >
                Đậm
              </button>
            </div>
          </div>
        </section>

        {/* Font Size & Line Height */}
        <section className="pref-section">
          <div className="pref-section__title">Kích thước</div>
          <div className="pref-grid-2">
            <div className="pref-stepper">
              <button
                type="button"
                className="pref-btn"
                onClick={() => onUpdate({ fontSize: Math.max(16, p.fontSize - 1) })}
                disabled={p.fontSize <= 16}
                aria-label="Giảm cỡ chữ"
              >
                A−
              </button>
              <div className="pref-stepper__value" aria-live="polite">
                <Type size={16} /> {p.fontSize}px
              </div>
              <button
                type="button"
                className="pref-btn"
                onClick={() => onUpdate({ fontSize: Math.min(26, p.fontSize + 1) })}
                disabled={p.fontSize >= 26}
                aria-label="Tăng cỡ chữ"
              >
                A+
              </button>
            </div>

            <div className="pref-segmented" role="group" aria-label="Giãn dòng">
              <button
                type="button"
                className={`pref-btn ${p.lineHeight === 'tight' ? 'is-active' : ''}`}
                onClick={() => onUpdate({ lineHeight: 'tight' })}
                aria-pressed={p.lineHeight === 'tight'}
                aria-label="Giãn dòng hẹp"
              >
                <List size={18} style={{ transform: 'scaleY(0.7)' }} />
              </button>
              <button
                type="button"
                className={`pref-btn ${p.lineHeight === 'normal' ? 'is-active' : ''}`}
                onClick={() => onUpdate({ lineHeight: 'normal' })}
                aria-pressed={p.lineHeight === 'normal'}
                aria-label="Giãn dòng vừa"
              >
                <List size={18} />
              </button>
              <button
                type="button"
                className={`pref-btn ${p.lineHeight === 'loose' ? 'is-active' : ''}`}
                onClick={() => onUpdate({ lineHeight: 'loose' })}
                aria-pressed={p.lineHeight === 'loose'}
                aria-label="Giãn dòng rộng"
              >
                <List size={18} style={{ transform: 'scaleY(1.3)' }} />
              </button>
            </div>
          </div>
        </section>

        {/* Alignment & Column Width */}
        <section className="pref-section">
          <div className="pref-section__title">Bố cục</div>
          <div className="pref-grid-2">
            <div className="pref-segmented" role="group" aria-label="Độ rộng cột">
              <button
                type="button"
                className={`pref-btn ${p.columnWidth === 'narrow' ? 'is-active' : ''}`}
                onClick={() => onUpdate({ columnWidth: 'narrow' })}
                aria-pressed={p.columnWidth === 'narrow'}
              >
                Hẹp
              </button>
              <button
                type="button"
                className={`pref-btn ${p.columnWidth === 'medium' ? 'is-active' : ''}`}
                onClick={() => onUpdate({ columnWidth: 'medium' })}
                aria-pressed={p.columnWidth === 'medium'}
              >
                Vừa
              </button>
              <button
                type="button"
                className={`pref-btn ${p.columnWidth === 'wide' ? 'is-active' : ''}`}
                onClick={() => onUpdate({ columnWidth: 'wide' })}
                aria-pressed={p.columnWidth === 'wide'}
              >
                Rộng
              </button>
            </div>
            <div className="pref-segmented" role="group" aria-label="Căn lề">
              <button
                type="button"
                className={`pref-btn ${p.textAlignment === 'left' ? 'is-active' : ''}`}
                onClick={() => onUpdate({ textAlignment: 'left' })}
                aria-pressed={p.textAlignment === 'left'}
                aria-label="Căn trái"
              >
                <AlignLeft size={18} />
              </button>
              <button
                type="button"
                className={`pref-btn ${p.textAlignment === 'justify' ? 'is-active' : ''}`}
                onClick={() => onUpdate({ textAlignment: 'justify' })}
                aria-pressed={p.textAlignment === 'justify'}
                aria-label="Căn đều hai bên"
              >
                <AlignJustify size={18} />
              </button>
            </div>
          </div>
        </section>
      </div>

      <footer className="reader-prefs__footer">
        <button type="button" className="pref-reset-btn" onClick={onReset}>
          <RotateCcw size={14} /> Khôi phục mặc định
        </button>
      </footer>
    </div>
    </div>
  );
}
