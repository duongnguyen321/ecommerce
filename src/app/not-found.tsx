import BackHome from '@/components/BackHome';
import Loading from '@/components/Loading';
import { MAIN_URL } from '@/configs/site.config';

export function generateMetadata({ status = 404 }) {
  return {
    title: {
      default: 'Oops, ' + status,
    },
    description: 'Sorry, this page does not exist',
    openGraph: {
      title: {
        default: 'Oops, ' + status,
      },
      description: 'Sorry, this page does not exist',
    },
    metadataBase: new URL(MAIN_URL as string),
  };
}
const NotFound = ({ status = 404 }) => {
  return (
    <>
      <Loading
        message={status.toString()}
        description={
          status === 404
            ? 'Sorry, this page does not exist'
            : 'Our fault, not yours'
        }
      />
      <BackHome isError />
    </>
  );
};

export default NotFound;
