import clsx from 'clsx';
import React from 'react';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  description: JSX.Element;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Extensions API',
    description: (
      <>
        Biscuit provides an extensions API that allows you to add new features
        to the editor. You can add your own commands, menus, and more.
      </>
    ),
  },
  {
    title: 'Language Tooling',
    description: (
      <>
        Biscuit has built-in support for 400+ languages. You
        can also add support for other languages by writing your own language
        lexers.
      </>
    ),
  },
  {
    title: 'Customizable',
    description: (
      <>
        Biscuit is lightweight and built to be customized. You can change the theme, the
        keybindings, the layout, and more.
      </>
    ),
  },
];

function Feature({title, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div>
        <div className="text--center padding-horiz--md">
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
