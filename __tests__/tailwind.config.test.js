const tailwindConfig = require('../tailwind.config.js');

describe('Tailwind Configuration - Dark Mode', () => {
  it('should have darkMode configured', () => {
    expect(tailwindConfig).toBeDefined();
    expect(tailwindConfig.darkMode).toBeDefined();
  });

  it('should use class-based dark mode strategy', () => {
    expect(tailwindConfig.darkMode).toBe('class');
  });

  it('should have content paths configured', () => {
    expect(tailwindConfig.content).toBeDefined();
    expect(Array.isArray(tailwindConfig.content)).toBe(true);
    expect(tailwindConfig.content.length).toBeGreaterThan(0);
  });

  it('should include src directory in content paths', () => {
    const hasSrcPath = tailwindConfig.content.some(path => 
      path.includes('src')
    );
    expect(hasSrcPath).toBe(true);
  });

  it('should support TypeScript and JavaScript files', () => {
    const hasTypeScriptSupport = tailwindConfig.content.some(path => 
      path.includes('.ts') || path.includes('.tsx')
    );
    expect(hasTypeScriptSupport).toBe(true);
  });

  it('should include index.html in content paths', () => {
    const hasIndexHtml = tailwindConfig.content.some(path => 
      path.includes('index.html')
    );
    expect(hasIndexHtml).toBe(true);
  });

  it('should have theme configuration', () => {
    expect(tailwindConfig.theme).toBeDefined();
  });

  it('should have plugins array', () => {
    expect(tailwindConfig.plugins).toBeDefined();
    expect(Array.isArray(tailwindConfig.plugins)).toBe(true);
  });
});