
import React from 'react';

const Model3dIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="m21.12 6.5-9-4.5a1 1 0 0 0-1 0l-9 4.5a1 1 0 0 0 .5 1.9l9 2.1 9-2.1a1 1 0 0 0 .5-1.9z" />
        <path d="M4.15 8.88 3 13.33a1 1 0 0 0 .89 1.15l8.06.94a1 1 0 0 0 1.1-.89l1.45-6.53" />
        <path d="m19.85 8.88-1.45 6.53a1 1 0 0 1-1.1.89l-8.06-.94a1 1 0 0 1-.89-1.15L10 8.5" />
        <path d="M12 22v-8" />
    </svg>
);

export default Model3dIcon;
