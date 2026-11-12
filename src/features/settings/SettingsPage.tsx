import { Component, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { useProgress } from '../../app/ProgressProvider';
import { usePageTitle } from '../../app/usePageTitle';
import { Button, Card, PageHeader } from '../../components/ui';
import { toDayKey } from '../../lib/game/days';
import { createSfx } from '../../lib/sound/sfx';
import { exportSave, parseImport, type SaveV1 } from '../../lib/storage';
import './SettingsPage.css';

const GOALS = [
  { value: 20, label: 'Leve (20 XP)' },
  { value: 50, label: 'Regular (50 XP)' },
  { value: 100, label: 'Intenso (100 XP)' },
] as const;

const NEW_CARD_CAPS = [10, 20, 30, 50] as const;
const REVIEW_CAPS = [50, 100, 200, 500] as const;

export interface ProgressFile {
  filename: string;
  text: string;
}

export function buildProgressFile(save: SaveV1, now: Date): ProgressFile {
  return {
    filename: `diw-arcade-progresso-${toDayKey(now)}.json`,
    text: JSON.stringify(exportSave(save, now), null, 2),
  };
}

function download(file: ProgressFile): void {
  const blob = new Blob([file.text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file.filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

interface SettingsBoundaryState {
  unavailable: boolean;
}

/**
 * Settings needs the progress store. The app always mounts it, but route-level
 * renders may not, so degrade to a readable page instead of crashing.
 */
class SettingsBoundary extends Component<
  { children: ReactNode },
  SettingsBoundaryState
> {
  state: SettingsBoundaryState = { unavailable: false };

  static getDerivedStateFromError(): SettingsBoundaryState {
    return { unavailable: true };
  }

  render() {
    if (this.state.unavailable) {
      return (
        <section className="page settings">
          <PageHeader title="Ajustes" />
          <Card as="section" className="settings__group">
            <p>O progresso não está disponível neste momento.</p>
          </Card>
        </section>
      );
    }
    return this.props.children;
  }
}

export function SettingsPage() {
  usePageTitle('Ajustes');

  return (
    <SettingsBoundary>
      <SettingsContent />
    </SettingsBoundary>
  );
}

function SettingsContent() {
  const { save, dispatch, now } = useProgress();
  const [sfx] = useState(() => createSfx());
  const [importError, setImportError] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<SaveV1 | null>(null);
  const [resetWord, setResetWord] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  function updateSettings(patch: Partial<SaveV1['settings']>) {
    dispatch({ type: 'settings/update', patch });
  }

  function handleTestSound() {
    sfx.setEnabled(true);
    sfx.play('correct');
    sfx.setEnabled(save.settings.sound);
  }

  function handleExport() {
    download(buildProgressFile(save, now));
    setNotice('Progresso exportado.');
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    setPendingImport(null);
    setImportError(null);
    setNotice(null);
    if (file === undefined) return;

    let text: string;
    try {
      text = await file.text();
    } catch {
      setImportError('Não foi possível ler o arquivo selecionado.');
      return;
    }

    const result = parseImport(text);
    if (!result.ok) {
      setImportError(result.error);
      return;
    }

    setPendingImport(result.save);
  }

  function handleConfirmImport() {
    if (pendingImport === null) return;
    dispatch({ type: 'save/replace', save: pendingImport });
    setPendingImport(null);
    setNotice('Progresso substituído.');
  }

  function handleCancelImport() {
    setPendingImport(null);
    setImportError(null);
  }

  function handleReset() {
    dispatch({ type: 'save/reset' });
    setPendingImport(null);
    setImportError(null);
    setResetWord('');
    setNotice('Progresso apagado. Você pode começar de novo.');
  }

  return (
    <section className="page settings">
      <PageHeader
        title="Ajustes"
        description="Defina seu ritmo de estudo, escolha os limites do dia e guarde uma cópia do progresso."
      />

      <div className="settings__groups">
        <Card
          as="section"
          tone="accent"
          className="settings__group"
          aria-labelledby="settings-goal"
        >
          <h2 id="settings-goal">Meta diária</h2>
          <p className="settings__hint">
            Quanto de XP você quer conquistar por dia? A meta orienta o ritmo
            das atividades.
          </p>
          <fieldset className="settings__goals">
            <legend className="settings__sr-only">Meta diária</legend>
            {GOALS.map(({ value, label }) => (
              <label className="settings__goal" key={value}>
                <input
                  type="radio"
                  name="daily-goal"
                  value={value}
                  checked={save.settings.dailyGoal === value}
                  onChange={() => updateSettings({ dailyGoal: value })}
                />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
        </Card>

        <Card
          as="section"
          className="settings__group"
          aria-labelledby="settings-cards"
        >
          <h2 id="settings-cards">Cartas</h2>
          <p className="settings__hint">
            Novas cartas e revisões têm limites separados. Ajuste conforme o
            tempo que você tem para estudar.
          </p>
          <div className="settings__fields">
            <div className="settings__field">
              <label htmlFor="settings-new-cards">Novas cartas por dia</label>
              <select
                id="settings-new-cards"
                value={save.settings.newCardsPerDay}
                onChange={(event) =>
                  updateSettings({ newCardsPerDay: Number(event.target.value) })
                }
              >
                {NEW_CARD_CAPS.map((cap) => (
                  <option key={cap} value={cap}>
                    {cap}
                  </option>
                ))}
              </select>
            </div>
            <div className="settings__field">
              <label htmlFor="settings-reviews">Revisões por dia</label>
              <select
                id="settings-reviews"
                value={save.settings.reviewsPerDay}
                onChange={(event) =>
                  updateSettings({ reviewsPerDay: Number(event.target.value) })
                }
              >
                {REVIEW_CAPS.map((cap) => (
                  <option key={cap} value={cap}>
                    {cap}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        <Card
          as="section"
          className="settings__group"
          aria-labelledby="settings-sound"
        >
          <h2 id="settings-sound">Som</h2>
          <div className="settings__row">
            <div>
              <label className="settings__switch">
                <input
                  type="checkbox"
                  checked={save.settings.sound}
                  aria-describedby="settings-sound-hint"
                  onChange={(event) =>
                    updateSettings({ sound: event.target.checked })
                  }
                />
                <span>Som</span>
              </label>
              <p className="settings__hint" id="settings-sound-hint">
                Efeitos sonoros ao acertar, subir de nível e concluir
                conquistas.
              </p>
            </div>
            <Button variant="secondary" onClick={handleTestSound}>
              Testar som
            </Button>
          </div>
        </Card>

        <Card
          as="section"
          className="settings__group"
          aria-labelledby="settings-data"
        >
          <h2 id="settings-data">Dados</h2>

          <div className="settings__row">
            <div>
              <p className="settings__label">Exportar progresso</p>
              <p className="settings__hint">
                Baixa um arquivo JSON com todo o seu progresso e configurações.
              </p>
            </div>
            <Button onClick={handleExport}>Exportar progresso</Button>
          </div>

          <hr className="settings__divider" />

          <div className="settings__field">
            <label htmlFor="settings-import">Importar progresso</label>
            <input
              id="settings-import"
              className="settings__file"
              type="file"
              accept=".json,application/json"
              onChange={handleImport}
            />
            <p className="settings__hint">
              Escolha um arquivo exportado do DIW Arcade. O progresso atual só
              é substituído depois da confirmação.
            </p>
          </div>

          {importError !== null ? (
            <p className="settings__error" role="alert">
              {importError}
            </p>
          ) : null}

          {pendingImport !== null ? (
            <div className="settings__confirm">
              <p className="settings__question" role="status">
                Substituir progresso atual?
              </p>
              <div className="settings__actions">
                <Button onClick={handleConfirmImport}>Confirmar</Button>
                <Button variant="ghost" onClick={handleCancelImport}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : null}

          <div className="settings__privacy">
            <h3>Privacidade</h3>
            <p className="settings__hint">
              Seu progresso fica guardado apenas neste navegador. O DIW Arcade
              não tem conta nem servidor: nada sai do seu dispositivo. Limpar
              os dados do site apaga o progresso, então exporte um backup
              antes.
            </p>
          </div>

          <hr className="settings__divider" />

          <div className="settings__danger">
            <h3>Apagar progresso</h3>
            <p className="settings__hint">
              Remove todo o XP, as cartas, as respostas e as configurações
              salvas neste navegador. A ação não pode ser desfeita.
            </p>
            <div className="settings__field">
              <label htmlFor="settings-reset-word">
                Digite APAGAR para confirmar
              </label>
              <input
                id="settings-reset-word"
                className="settings__text"
                type="text"
                value={resetWord}
                placeholder="APAGAR"
                autoComplete="off"
                spellCheck={false}
                onChange={(event) => setResetWord(event.target.value)}
              />
            </div>
            <div className="settings__actions">
              <Button
                variant="danger"
                disabled={resetWord !== 'APAGAR'}
                onClick={handleReset}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <p className="settings__notice" role="status">
        {notice}
      </p>
    </section>
  );
}
