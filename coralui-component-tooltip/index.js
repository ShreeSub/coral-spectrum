import '../coralui-theme-spectrum';
import './src/styles/index.css';

import '../coralui-externals';
import '../coralui-compat';

import Tooltip from './src/scripts/Tooltip';
import TooltipContent from './src/scripts/TooltipContent';

// Expose component on the Coral namespace
window.customElements.define('coral-tooltip', Tooltip);
window.customElements.define('coral-tooltip-content', TooltipContent);

Tooltip.Content = TooltipContent;

export {Tooltip};
