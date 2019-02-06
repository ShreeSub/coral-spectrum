import {helpers} from '../../../coralui-utils/src/tests/helpers';
import {Shell} from '../../../coralui-component-shell';

describe('Shell.SolutionSwitcher', function() {
  describe('Namespace', function() {
    it('should be defined in the Shell namespace', function() {
      expect(Shell).to.have.property('SolutionSwitcher');
      expect(Shell).to.have.property('Solutions');
      expect(Shell).to.have.property('Solution');
      expect(Shell.Solution).to.have.property('Label');
    });
  });
  
  describe('Initialization', function() {
    it('should support creation from markup', function() {
      const el = helpers.build(window.__html__['Shell.SolutionSwitcher.base.html']);
      expect(el instanceof Shell.SolutionSwitcher).to.equal(true);
    });
  
    it('should support creation from js', function() {
      var el = helpers.build(new Shell.SolutionSwitcher());
      expect(el instanceof Shell.SolutionSwitcher).to.equal(true);
    });
  
    helpers.cloneComponent(
      'should be possible to clone using markup',
      window.__html__['Shell.SolutionSwitcher.base.html']
    );
  
    const el = new Shell.SolutionSwitcher();
    const solutions = el.items.add();
    solutions.items.add();
  
    helpers.cloneComponent(
      'should be possible to clone using js',
      el
    );
  });
});