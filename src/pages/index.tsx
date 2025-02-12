import { GetStaticProps } from 'next';
import Link from 'next/link';
import { format } from 'date-fns';

import { getPrismicClient } from '../services/prismic';
import * as prismicH from '@prismicio/helpers'
import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';
import Head from 'next/head';
import Header from '../components/Header';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
  preview: boolean;
}

export default function Home({
    postsPagination,
    preview,
  }: HomeProps): JSX.Element {


    function getReadTime(item: Post): number {
      // const totalWords = item.data.reduce((total, contentItem) => {
      //   total += contentItem.heading.split(' ').length;

      //   const words = contentItem.body.map(i => i.text.split(' ').length);
      //   words.map(word => (total += word));
      //   return total;
      // }, 0);
      // return Math.ceil(totalWords / 200);
    }

    const formattedPost = postsPagination.results.map(post => {
      const readTime = getReadTime(post);

      return {
        ...post,
        data: {
          ...post.data,
          readTime,
        },
        first_publication_date: format(
          new Date(post.first_publication_date),
          'dd MMM yyyy',
          {
            locale: ptBR,
          }
        ),
      };
    });
    const [posts, setPosts] = useState<Post[]>(formattedPost);
    const [nextPage, setNextPage] = useState(postsPagination.next_page);
    const [currentPage, setCurrentPage] = useState(1);

    async function handleNextPage(): Promise<void> {
      if (currentPage !== 1 && nextPage === null) {
        return;
      }

      const postsResults = await fetch(`${nextPage}`).then(response =>
        response.json()
      );
      setNextPage(postsResults.next_page);
      setCurrentPage(postsResults.page);

      const newPosts = postsResults.results.map((post: Post) => {
        const readTime = getReadTime(post);

        return {
          uid: post.uid,
          first_publication_date: format(
            new Date(post.first_publication_date),
            'dd MMM yyyy',
            {
              locale: ptBR,
            }
          ),
          data: {
            title: post.data.title,
            subtitle: post.data.subtitle,
            author: post.data.author,
            readTime,
          },
        };
      });

      setPosts([...posts, ...newPosts]);
    }


  return (
    <>
      <Head>
        <title>Home | spacetraveling</title>
      </Head>

      <main className={commonStyles.container}>
        <Header />

        <div className={styles.posts}>
          {posts.map(post => (
            <Link href={`/post/${post.uid}`} key={post.uid}>
              <a className={styles.post}>
                <strong>{post.data.title}</strong>
                <p>{post.data.subtitle}</p>
                <ul>
                  <li>
                    <FiCalendar />
                    {post.first_publication_date}
                  </li>
                  <li>
                    <FiUser />
                    {post.data.author}
                  </li>
                  <li>
                    <FiClock />
                    {/* {`${post.data.readTime} min`} */}
                  </li>
                </ul>
              </a>
            </Link>
          ))}

          {nextPage && (
            <button type="button" onClick={handleNextPage}>
              Carregar mais posts
            </button>
          )}
        </div>

        {preview && (
          <aside>
            <Link href="/api/exit-preview">
              <a className={commonStyles.preview}>Sair do modo Preview</a>
            </Link>
          </aside>
        )}
      </main>
    </>
  )
}

export const getStaticProps: GetStaticProps = async ({preview = false}) => {
  const prismic = getPrismicClient({});
  const postsResponse = await prismic.getByType('myblog', {
    pageSize: 20,
    lang: '*',
  });

  const posts = postsResponse.results.map((post) => {
    return {
      uid: post.uid,
      first_publication_date: post.first_publication_date,
      data: {
        title: post.data.title,
        subtitle: prismicH.asText(post.data.subtitle),
        author: prismicH.asText(post.data.author),
        content: post.data.content.map(content => {
          return {
            heading: content.heading,
            body: [...content.body],
          };
        }),
      }
    }
  })

  const postsPagination = {
    next_page: postsResponse.next_page,
    results: posts
  }

  return {
    props: {
      postsPagination,
      preview,
    },
    revalidate: 2000
  }
};
