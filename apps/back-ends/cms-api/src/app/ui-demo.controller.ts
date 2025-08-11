import { Controller, Get } from '@nestjs/common';
import { Button, Card } from '@keystone/ui';
import React from 'react';
// Note: In a real app, you'd need to set up server-side rendering for React

@Controller('ui-demo')
export class UIDemoController {
  
  @Get('component-info')
  getComponentInfo() {
    return {
      message: '✅ Shared UI package is accessible from backend!',
      availableComponents: [
        'Button - with variants: primary, secondary, outline, danger',
        'Input - with label, error states, and icons',
        'Card - with different variants and padding options',
        'Form, FormField, FormActions - for form layouts'
      ],
      note: 'These components can be used for email templates, PDF generation, or any server-side rendering needs',
      exampleUsage: {
        // This shows the components are accessible, though we'd need SSR setup for actual rendering
        buttonExists: typeof Button === 'function',
        cardExists: typeof Card === 'function',
        reactVersion: React.version
      }
    };
  }

  @Get('email-template-structure')
  getEmailTemplateStructure() {
    // This demonstrates how we could structure data for email templates using our UI components
    return {
      templateType: 'Welcome Email',
      structure: {
        header: {
          component: 'Card',
          props: { variant: 'elevated', padding: 'lg' },
          content: 'Welcome to Keystone CMS'
        },
        body: {
          component: 'Card',
          props: { variant: 'default', padding: 'md' },
          content: 'Your tenant has been created successfully'
        },
        footer: {
          component: 'Button',
          props: { variant: 'primary', size: 'lg' },
          content: 'Get Started'
        }
      },
      note: 'In a full implementation, we could render these to HTML strings for email sending'
    };
  }
}
