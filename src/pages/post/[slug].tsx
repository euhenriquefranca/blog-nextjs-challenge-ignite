import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { useRouter } from 'next/router';
import Prismic from '@prismicio/client';
import { RichText } from 'prismic-dom';
import Header from '../../components/Header';

import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps) {
  const router = useRouter();
  const readingTime = post.data.content.reduce((acc, content) => {
    const headingWords = content.heading.split(' ');
    const bodyWords = RichText.asText(content.body).split(' ');
    acc += headingWords.length;
    acc += bodyWords.length;

    return acc;
  }, 0);

  if (router.isFallback) {
    return <div>Carregando...</div>;
  }

  return (
    <>
      <Head>
        <title>Post | SpaceTraveling</title>
      </Head>
      <Header />
      <img src={post.data.banner.url} className={styles.banner} alt="Banner" />
      <main className={styles.container}>
        <h1>{post.data.title}</h1>
        <div className={commonStyles.postInfo}>
          <div className={commonStyles.postPublicationDate}>
            <FiCalendar />
            <time>
              {format(new Date(post.first_publication_date), 'dd MMM yyyy', {
                locale: ptBR,
              })}
            </time>
          </div>
          <div className={commonStyles.postAuthor}>
            <FiUser />
            <span>{post.data.author}</span>
          </div>
          <div className={commonStyles.readingTime}>
            <FiClock />
            <time>{Math.ceil(readingTime / 200)} min</time>
          </div>
        </div>
        <article className={styles.content}>
          {post.data.content.map(content => (
            <section key={content.heading}>
              <h2>{content.heading}</h2>
              {content.body.map(body => (
                <p key={body.text}>{body.text}</p>
              ))}
            </section>
          ))}
        </article>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query([
    Prismic.predicates.at('document.type', 'post'),
  ]);

  const params = posts.results.map(post => ({
    params: {
      slug: post.uid,
    },
  }));

  return {
    paths: params,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { slug } = params;

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('post', String(slug), {});

  const contents = response.data.content.map(content => {
    const contentObj = {};
    let bodies = [];
    Object.assign(contentObj, { heading: content.heading });

    bodies = content.body.map(item => {
      return {
        ...item,
      };
    });

    Object.assign(contentObj, { body: bodies });
    return contentObj;
  });

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: contents,
    },
  };

  return {
    props: {
      post,
    },
    revalidate: 60 * 30, // 30 minutes
  };
};
