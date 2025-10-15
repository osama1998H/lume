import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TitleBar from '../TitleBar';

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      if (key === 'app.name') return 'Lume';
      if (key === 'app.tagline') return 'Track Your Time, Master Your Life';
      return key;
    },
  }),
}));

describe('TitleBar', () => {
  describe('Rendering', () => {
    it('renders the title bar container', () => {
      const { container } = render(<TitleBar />);
      const titleBar = container.querySelector('.titlebar');
      expect(titleBar).toBeInTheDocument();
    });

    it('renders the logo emoji', () => {
      const { container } = render(<TitleBar />);
      const logo = container.querySelector('.titlebar-logo span');
      expect(logo).toHaveTextContent('⏱️');
    });

    it('renders the app name from translation', () => {
      render(<TitleBar />);
      expect(screen.getByText('Lume')).toBeInTheDocument();
    });

    it('renders the app tagline from translation', () => {
      render(<TitleBar />);
      expect(screen.getByText('Track Your Time, Master Your Life')).toBeInTheDocument();
    });

    it('renders the separator between logo and tagline', () => {
      const { container } = render(<TitleBar />);
      const separator = container.querySelector('.titlebar-separator');
      expect(separator).toBeInTheDocument();
      expect(separator).toHaveTextContent('•');
    });
  });

  describe('Structure', () => {
    it('has correct CSS classes for container', () => {
      const { container } = render(<TitleBar />);
      const titleBar = container.querySelector('.titlebar');
      expect(titleBar).toHaveClass('titlebar');
    });

    it('has correct CSS classes for content', () => {
      const { container } = render(<TitleBar />);
      const content = container.querySelector('.titlebar-content');
      expect(content).toBeInTheDocument();
      expect(content).toHaveClass('titlebar-content');
    });

    it('has correct CSS classes for logo section', () => {
      const { container } = render(<TitleBar />);
      const logo = container.querySelector('.titlebar-logo');
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveClass('titlebar-logo');
    });

    it('has correct CSS classes for title', () => {
      const { container } = render(<TitleBar />);
      const title = container.querySelector('.titlebar-title');
      expect(title).toBeInTheDocument();
      expect(title).toHaveClass('titlebar-title');
    });

    it('has correct CSS classes for tagline', () => {
      const { container } = render(<TitleBar />);
      const tagline = container.querySelector('.titlebar-tagline');
      expect(tagline).toBeInTheDocument();
      expect(tagline).toHaveClass('titlebar-tagline');
    });
  });

  describe('Accessibility', () => {
    it('has aria-hidden on decorative logo emoji', () => {
      const { container } = render(<TitleBar />);
      const logo = container.querySelector('.titlebar-logo span');
      expect(logo).toHaveAttribute('aria-hidden', 'true');
    });

    it('has aria-hidden on decorative separator', () => {
      const { container } = render(<TitleBar />);
      const separator = container.querySelector('.titlebar-separator');
      expect(separator).toHaveAttribute('aria-hidden', 'true');
    });

    it('title element is accessible for screen readers', () => {
      const { container } = render(<TitleBar />);
      const title = container.querySelector('.titlebar-title');
      expect(title).not.toHaveAttribute('aria-hidden');
    });
  });

  describe('Layout', () => {
    it('logo emoji has correct font size class', () => {
      const { container } = render(<TitleBar />);
      const logo = container.querySelector('.titlebar-logo span');
      expect(logo).toHaveClass('text-xl');
    });

    it('renders logo and title in same section', () => {
      const { container } = render(<TitleBar />);
      const logoSection = container.querySelector('.titlebar-logo');
      expect(logoSection?.querySelector('span')).toBeInTheDocument(); // emoji
      expect(logoSection?.querySelector('.titlebar-title')).toBeInTheDocument(); // title
    });
  });

  describe('Content', () => {
    it('displays non-empty app name', () => {
      render(<TitleBar />);
      const appName = screen.getByText('Lume');
      expect(appName.textContent).toBeTruthy();
      expect(appName.textContent?.length).toBeGreaterThan(0);
    });

    it('displays non-empty tagline', () => {
      render(<TitleBar />);
      const tagline = screen.getByText('Track Your Time, Master Your Life');
      expect(tagline.textContent).toBeTruthy();
      expect(tagline.textContent?.length).toBeGreaterThan(0);
    });
  });
});
