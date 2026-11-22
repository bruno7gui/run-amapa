'use client';

import { useState } from 'react';
import { dedicationOptOut } from '../lib/registration';

export default function DedicationField() {
  const [dedication, setDedication] = useState('');
  const [optOut, setOptOut] = useState(false);
  return <div className="stack">
    <label>Seu laço — por quem você vai correr esses 5 km?
      <input name="dedication" maxLength={100} value={dedication} onChange={event => setDedication(event.target.value)}
        disabled={optOut} required={!optOut} aria-describedby="dedication-help" />
    </label>
    <p className="field-help" id="dedication-help">Preencha seu laço ou marque a opção abaixo.</p>
    <label className="check"><input type="checkbox" name="dedication_opt_out" checked={optOut}
      onChange={event => setOptOut(event.target.checked)} required={!dedication.trim()} />
      <span>{dedicationOptOut}</span>
    </label>
  </div>;
}
