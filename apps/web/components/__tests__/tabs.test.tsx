import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tabs, TabsList, TabsTrigger, TabsContent, Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../ui/tabs';

describe('Tabs', () => {
  describe('rendering', () => {
    it('should render tabs', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );
      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });

    it('should render tab triggers', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );
      expect(screen.getByRole('tab', { name: 'Tab 1' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Tab 2' })).toBeInTheDocument();
    });

    it('should show default tab content', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );
      expect(screen.getByRole('tabpanel')).toHaveTextContent('Content 1');
      expect(screen.queryByText('Content 2')).not.toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should switch tabs when clicked', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );

      fireEvent.click(screen.getByRole('tab', { name: 'Tab 2' }));
      expect(screen.getByRole('tabpanel')).toHaveTextContent('Content 2');
      expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
    });

    it('should call onValueChange when tab changes', () => {
      const handleChange = vi.fn();
      render(
        <Tabs defaultValue="tab1" onValueChange={handleChange}>
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );

      fireEvent.click(screen.getByRole('tab', { name: 'Tab 2' }));
      expect(handleChange).toHaveBeenCalledWith('tab2');
    });

    it('should not switch to disabled tab', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2" disabled>Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );

      fireEvent.click(screen.getByRole('tab', { name: 'Tab 2' }));
      expect(screen.getByRole('tabpanel')).toHaveTextContent('Content 1');
    });
  });

  describe('controlled mode', () => {
    it('should work with controlled value', () => {
      const { rerender } = render(
        <Tabs value="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );

      expect(screen.getByRole('tabpanel')).toHaveTextContent('Content 1');

      rerender(
        <Tabs value="tab2">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );

      expect(screen.getByRole('tabpanel')).toHaveTextContent('Content 2');
    });
  });

  describe('accessibility', () => {
    it('should have aria-selected on active tab', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );

      expect(screen.getByRole('tab', { name: 'Tab 1' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tab', { name: 'Tab 2' })).toHaveAttribute('aria-selected', 'false');
    });

    it('should have aria-disabled on disabled tab', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2" disabled>Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );

      expect(screen.getByRole('tab', { name: 'Tab 2' })).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('styling', () => {
    it('should apply custom className to TabsList', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList className="custom-class">
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );

      expect(screen.getByRole('tablist')).toHaveClass('custom-class');
    });

    it('should apply custom className to TabsTrigger', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1" className="custom-class">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );

      expect(screen.getByRole('tab', { name: 'Tab 1' })).toHaveClass('custom-class');
    });

    it('should apply custom className to TabsContent', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" className="custom-class">Content 1</TabsContent>
        </Tabs>
      );

      expect(screen.getByRole('tabpanel')).toHaveClass('custom-class');
    });
  });
});

describe('Accordion', () => {
  describe('rendering', () => {
    it('should render accordion items', () => {
      render(
        <Accordion>
          <AccordionItem value="item1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
          <AccordionItem value="item2">
            <AccordionTrigger>Item 2</AccordionTrigger>
            <AccordionContent>Content 2</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });

    it('should hide content by default', () => {
      render(
        <Accordion>
          <AccordionItem value="item1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
    });

    it('should show content when defaultValue is set', () => {
      render(
        <Accordion defaultValue={['item1']}>
          <AccordionItem value="item1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should toggle content when trigger is clicked', () => {
      render(
        <Accordion>
          <AccordionItem value="item1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      expect(screen.queryByText('Content 1')).not.toBeInTheDocument();

      fireEvent.click(screen.getByText('Item 1'));
      expect(screen.getByText('Content 1')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Item 1'));
      expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
    });

    it('should allow multiple items open when type is multiple', () => {
      render(
        <Accordion type="multiple">
          <AccordionItem value="item1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
          <AccordionItem value="item2">
            <AccordionTrigger>Item 2</AccordionTrigger>
            <AccordionContent>Content 2</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      fireEvent.click(screen.getByText('Item 1'));
      fireEvent.click(screen.getByText('Item 2'));

      expect(screen.getByText('Content 1')).toBeInTheDocument();
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });

    it('should close other items when type is single', () => {
      render(
        <Accordion type="single">
          <AccordionItem value="item1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
          <AccordionItem value="item2">
            <AccordionTrigger>Item 2</AccordionTrigger>
            <AccordionContent>Content 2</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      fireEvent.click(screen.getByText('Item 1'));
      expect(screen.getByText('Content 1')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Item 2'));
      expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });

    it('should not toggle disabled item', () => {
      render(
        <Accordion>
          <AccordionItem value="item1" disabled>
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      fireEvent.click(screen.getByText('Item 1'));
      expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
    });
  });

  describe('controlled mode', () => {
    it('should work with controlled value', () => {
      const { rerender } = render(
        <Accordion value={['item1']}>
          <AccordionItem value="item1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
          <AccordionItem value="item2">
            <AccordionTrigger>Item 2</AccordionTrigger>
            <AccordionContent>Content 2</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      expect(screen.getByText('Content 1')).toBeInTheDocument();
      expect(screen.queryByText('Content 2')).not.toBeInTheDocument();

      rerender(
        <Accordion value={['item2']}>
          <AccordionItem value="item1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
          <AccordionItem value="item2">
            <AccordionTrigger>Item 2</AccordionTrigger>
            <AccordionContent>Content 2</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });

    it('should call onValueChange when item is toggled', () => {
      const handleChange = vi.fn();
      render(
        <Accordion onValueChange={handleChange}>
          <AccordionItem value="item1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      fireEvent.click(screen.getByText('Item 1'));
      expect(handleChange).toHaveBeenCalledWith(['item1']);
    });
  });

  describe('accessibility', () => {
    it('should have button role on trigger', () => {
      render(
        <Accordion>
          <AccordionItem value="item1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      expect(screen.getByRole('button', { name: 'Item 1' })).toBeInTheDocument();
    });

    it('should have aria-expanded attribute', () => {
      render(
        <Accordion>
          <AccordionItem value="item1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      const trigger = screen.getByRole('button', { name: 'Item 1' });
      expect(trigger).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });

    it('should have aria-disabled on disabled trigger', () => {
      render(
        <Accordion>
          <AccordionItem value="item1" disabled>
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      expect(screen.getByRole('button', { name: 'Item 1' })).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('styling', () => {
    it('should apply custom className to AccordionItem', () => {
      render(
        <Accordion>
          <AccordionItem value="item1" className="custom-class">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      expect(screen.getByTestId('accordion-item')).toHaveClass('custom-class');
    });

    it('should apply custom className to AccordionTrigger', () => {
      render(
        <Accordion>
          <AccordionItem value="item1">
            <AccordionTrigger className="custom-class">Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      expect(screen.getByRole('button', { name: 'Item 1' })).toHaveClass('custom-class');
    });

    it('should apply custom className to AccordionContent', () => {
      render(
        <Accordion defaultValue={['item1']}>
          <AccordionItem value="item1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent className="custom-class">Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      expect(screen.getByTestId('accordion-content')).toHaveClass('custom-class');
    });
  });
});
