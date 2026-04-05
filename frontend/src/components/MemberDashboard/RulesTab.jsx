import React from 'react';

export default function RulesTab() {
  const sections = [
    { 
      icon: 'fa-door-open', 
      title: 'Vstup a prevádzka', 
      items: [
        'Vstup je povolený len s platným členstvom cez QR kód alebo NFC čip.', 
        'Otváracie hodiny: Pon–Pia 6:00–22:00, Sob–Ned 8:00–20:00.', 
        'Každý návštevník sa prihlási pri vstupe na terminál pri recepcii.', 
        'Osoby mladšie ako 15 rokov len v sprievode dospelého.'
      ] 
    },
    { 
      icon: 'fa-dumbbell', 
      title: 'Používanie zariadení', 
      items: [
        'Po každom cvičení utrieť zariadenie dezinfekčným prostriedkom.', 
        'Náradie vráť na pôvodné miesto po použití.', 
        'Počas špičky (17:00–20:00) max 20 min na každom stroji.', 
        'Mobily na foto/video len pre osobné účely bez cudzích osôb v zábere.'
      ] 
    },
    { 
      icon: 'fa-calendar-check', 
      title: 'Skupinové lekcie a rezervácie', 
      items: [
        'Rezerváciu urob najmenej 2 hodiny pred začiatkom lekcie.', 
        'Zrušenie najmenej 1 hodinu vopred — inak sa zaznamená no-show.', 
        'Po 3 no-show v mesiaci bude rezervácia zablokovaná na 7 dní.', 
        'Príď 5 minút pred začiatkom. Neskorší príchod o 10+ min nie je povolený.'
      ] 
    },
    { 
      icon: 'fa-tshirt', 
      title: 'Oblečenie a hygiena', 
      items: [
        'Povinné je športové oblečenie a čistá vnútorná obuv.', 
        'V posilňovni je povinný uterák na sedadle a záťaži.', 
        'Sprchy sú v šatniach — udržiavaj čistotu.'
      ] 
    },
    { 
      icon: 'fa-credit-card', 
      title: 'Členstvo a platby', 
      items: [
        'Členstvo sa automaticky neobnovuje — predĺženie treba uhradiť včas.', 
        'Vrátenie poplatku nie je možné po 48 hodinách od zakúpenia.', 
        'Pri strate QR kódu kontaktuj recepciu.', 
        'Zľavy (študentská, seniorská) vyžadujú platný doklad.'
      ] 
    },
    { 
      icon: 'fa-exclamation-triangle', 
      title: 'Bezpečnosť', 
      items: [
        'Centrum nezodpovedá za odcudzené veci. Používaj uzamykateľné skrinky.', 
        'Cvičenie pod vplyvom alkoholu alebo drog je prísne zakázané.', 
        'Pri zdravotných problémoch informuj personál — prvá pomoc je na recepcii.', 
        'Porušenie pravidiel môže viesť k okamžitému vykázaniu a zrušeniu členstva.'
      ] 
    },
  ];

  return (
    <div className="panel">
      <div className="ph">
        <span className="pt">Pravidlá a poriadok FITNESS PRO</span>
      </div>
      <div className="pb">
        {sections.map(s => (
          <div key={s.title} className="rule-sec">
            <h4><i className={`fas ${s.icon}`} /> {s.title}</h4>
            <ul className="rule-list">
              {s.items.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </div>
        ))}
        <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '1.3rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
          Posledná aktualizácia: Január 2026 &nbsp;·&nbsp;
          <span style={{ color: 'var(--acid)' }}>podpora@fitnesspro.sk</span> &nbsp;·&nbsp; +421 905 123 456
        </p>
      </div>
    </div>
  );
}
