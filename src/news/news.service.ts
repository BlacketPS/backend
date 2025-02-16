import { NewsNewsPostEntity, NewsVoteDto } from "@blacket/types";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class NewsService {
    constructor(
        private prismaService: PrismaService
    ) { }

    async getNews(userId: string): Promise<NewsNewsPostEntity[]> {
        const rawNews = await this.prismaService.newsPost.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                image: true,
                author: true,
                votes: true
            }
        });

        const news: NewsNewsPostEntity[] = [];

        for (const post of rawNews) {
            const constructedPost: NewsNewsPostEntity = { ...post, votes: { upvotes: 0, downvotes: 0 } };

            const myVote = post.votes.find((vote) => vote.userId === userId);
            if (myVote) constructedPost.myVote = myVote.vote;

            for (const vote of post.votes) {
                if (vote.vote) constructedPost.votes.upvotes++;
                else constructedPost.votes.downvotes++;
            }

            news.push(constructedPost);
        }

        return news;
    }

    async upsertVote(userId: string, newsPostId: number, dto: NewsVoteDto): Promise<void> {
        const post = await this.prismaService.newsPost.findUnique({ where: { id: newsPostId } });
        if (!post) return;

        const user = await this.prismaService.user.findUnique({ where: { id: userId } });
        if (!user) return;

        const vote = await this.prismaService.userNewsPostVote.findFirst({
            where: {
                newsPostId: newsPostId,
                userId: userId
            }
        });

        if (vote) await this.prismaService.userNewsPostVote.update({
            where: { id: vote.id },
            data: {
                vote: dto.value
            }
        });
        else await this.prismaService.userNewsPostVote.create({
            data: {
                userId,
                newsPostId,
                vote: dto.value
            }
        });
    }

    async deleteVote(userId: string, newsPostId: number) {
        const vote = await this.prismaService.userNewsPostVote.findFirst({
            where: {
                newsPostId,
                userId
            }
        });
        if (!vote) return;

        await this.prismaService.userNewsPostVote.delete({ where: { id: vote.id } });
    }
}
