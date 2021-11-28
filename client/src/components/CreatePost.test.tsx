import React from 'react';
import CreatePost from './CreatePost';
import { unmountComponentAtNode } from 'react-dom';
import { act } from 'react-dom/test-utils';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

let container: HTMLElement | null = null;
beforeEach(() => {
  // setup a DOM element as a render target
  container = document.createElement('div');
  document.body.appendChild(container);
  act(() => {
    render(<CreatePost />);
  });
  screen.getByTestId('newPostButton').click();
});

afterEach(() => {
  // cleanup on exiting
  if (container != null) {
    unmountComponentAtNode(container);
    container.remove();
    container = null;
    cleanup();
  }
});

describe('verifying launch of create post component', () => {
  it('shows the preview button as disabled', () => {
    // get the preview button
    expect(screen.getByTestId('previewButton')).toBeDisabled();
  });

  it('should enable the preview button after providing required fields', () => {
    // input title
    const titleTextField = screen.getByPlaceholderText('title');
    fireEvent.change(titleTextField, { target: { value: 'Test Club' } });
    // input body
    const bodyTextField = screen.getByTestId('bodyTextField');
    fireEvent.change(bodyTextField, {
      target: { value: 'This should be at least 25 characters long' },
    });
    fireEvent.blur(bodyTextField);
    expect(screen.getByTestId('previewButton')).not.toBeDisabled();
  });

  it('renders `previewPopUp` component upon clicking Preview', () => {
    // input title
    fireEvent.change(screen.getByPlaceholderText('title'), {
      target: { value: 'Test Club' },
    });
    // input body
    const bodyTextField = screen.getByTestId('bodyTextField');
    fireEvent.change(bodyTextField, {
      target: { value: 'This should be at least 25 characters long' },
    });
    fireEvent.blur(bodyTextField);
    // pop up should render
    screen.getByTestId('previewButton').click();
    expect(screen.getByTestId('PreviewPopUpComponent')).toBeInTheDocument();
  });

  it('closes the dialog when clicked on `Back` button', () => {
    expect(screen.getByTestId('newPostButton')).toBeInTheDocument();
  });
});
