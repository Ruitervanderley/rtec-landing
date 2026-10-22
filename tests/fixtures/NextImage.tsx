import type { ImageProps } from 'next/image';

function TestImage(props: ImageProps) {
  // Browser unit tests do not run the Next.js image optimizer.
  // eslint-disable-next-line next/no-img-element
  return <img src={typeof props.src === 'string' ? props.src : ''} alt={props.alt} width={props.width} height={props.height} />;
}

export { TestImage as default };
