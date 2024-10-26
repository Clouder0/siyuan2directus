import {
	authentication,
	createDirectus,
	createItem,
	readItem,
	rest,
	updateItem,
} from "@directus/sdk";
import { z } from "zod";
import { config } from "./conf";

export const blog_post_schema = z.object({
	id: z.string().optional(),
	title: z.string(),
	slug: z.string(),
	status: z.enum(["published", "draft", "archived"]),
	featured: z.boolean(),
	tags: z.array(z.string()),
	lang: z.enum(["zh-cn", "en"]),
	description: z.string(),
	content: z.string(),
});
export type BlogPost = z.infer<typeof blog_post_schema>;
export type DirectusSchema = {
	BlogPosts: BlogPost[];
};

const client = createDirectus<DirectusSchema>(config.directus.url)
	.with(rest())
	.with(authentication());
export const syncPost = async (
	post: Omit<BlogPost, "id" | "date_created"> & { id?: string },
) => {
    await client.login(
        config.directus.username,
        config.directus.password
    );

	if (post.id) {
		// update
		await client.request(
			updateItem("BlogPosts", post.id, { ...post, id: undefined }),
		);
		const res = await client.request(readItem("BlogPosts", post.id));
		return res;
	}
	return await client.request(createItem("BlogPosts", post));
};
