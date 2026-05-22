import { useState } from 'react'
import { BrandLogo } from '../components/BrandLogo'
import { Icon } from '../components/Icon'

export function DeclarationRequired({
  onConfirm,
  onRefuse,
  submitting = false,
}: {
  onConfirm: () => void
  onRefuse: () => void
  submitting?: boolean
}) {
  const [checked, setChecked] = useState(false)

  return (
    <main className="screen">
      <BrandLogo />
      <div className="stage">
        <div className="col col-480">
          <p className="kicker">Etapa adicional</p>
          <h1 className="h1">Verificação adicional</h1>
          <p className="body-text">
            Nosso sistema estimou sua idade na faixa 16-21 anos. Para prosseguir, você precisa
            declarar explicitamente que é maior de 18 anos.
          </p>
          <label className="checkbox-row" data-checked={checked ? 'true' : 'false'}>
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              disabled={submitting}
              className="sr-only"
            />
            <span className="cb-box" aria-hidden="true">
              <Icon.check style={{ width: 14, height: 14, color: 'white' }} />
            </span>
            <span className="cb-label">
              Declaro, sob as penas da lei, que tenho 18 anos ou mais e estou apto a acessar
              este conteúdo.
            </span>
          </label>
          <div className="actions actions-pinned">
            <button
              type="button"
              className="btn btn-secondary btn-lg"
              onClick={onRefuse}
              disabled={submitting}
              aria-disabled={submitting}
            >
              Não declarar
            </button>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={onConfirm}
              disabled={!checked || submitting}
              aria-disabled={!checked || submitting}
            >
              {submitting && <span className="spinner" aria-hidden="true" />}
              {submitting ? 'Confirmando...' : 'Confirmar declaração'}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
