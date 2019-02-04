import '../coralui-theme-spectrum';
import './src/styles/index.css';

import '../coralui-externals';
import '../coralui-compat';

import Checkbox from './src/scripts/Checkbox';
import CheckboxLabel from './src/scripts/CheckboxLabel';

// Expose component on the Coral namespace
window.customElements.define('coral-checkbox', Checkbox);

Checkbox.Label = CheckboxLabel;

export {Checkbox};
