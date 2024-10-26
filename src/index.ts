import { format } from "date-fns";

import { z } from "zod";
import { blog_post_schema, syncPost, type BlogPost } from "./directus";
import { genClient } from "./siyuan";
import { config } from "./conf";

export const sql_res_type = z.array(
	z.object({
		id: z.string(),
		parent_id: z.string(),
		root_id: z.string(),
		created: z.string(),
		updated: z.string(),
		last_update: z.string(),
		content: z.string(),
		markdown: z.string(),
	}),
);

/* 初始化为 Fetch 客户端 (使用 ofetch 发起 Fetch 请求) */
const client = genClient(config.siyuan.base,config.siyuan.token)

export const syncBlocks = async () => {
	const nowtime = new Date((await client.currentTime()).data);
	const timestr = format(nowtime, "yyyyMMddHHmmss");
	console.log(timestr);
	const docs = (
		await client.sql({
			stmt: `SELECT * FROM 'blocks' b INNER JOIN 
        (SELECT block_id, value AS 'last_update' FROM 'attributes' WHERE name == 'custom-directus-last-update') a  
        ON b.id  == a.block_id AND b.updated > a.last_update AND b.type == 'd'`,
		})
	).data;

	if (!docs || docs.length === 0) {
        console.log("没有需要同步的内容");
		return {status: "0", data: "nothing to sync."};
	}
    let count = 0
	await Promise.all(
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		docs.map(async (x: any) => {
			const attrs = (await client.getBlockAttrs({ id: x.id })).data;
			const dire_attrs = Object.fromEntries(
				Object.entries(attrs)
					.filter((x, _) => x[0].startsWith("custom-directus-"))
					.map((x, _) => [
						x[0].replace("custom-directus-", "").replaceAll("-", "_"),
						x[1],
					]),
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			) as any;
			const content = (
				(await client.exportMdContent({ id: x.id })).data.content as string
			).replace(`# ${x.content}\n\n`, "");
			const res = {
				...(dire_attrs.id ? { id: dire_attrs.id } : {}),
				title: x.content as string,
				slug: dire_attrs.slug,
				status: dire_attrs.status ?? "published",
				featured: dire_attrs.featured === "true",
				tags: dire_attrs.tags
					? (dire_attrs.tags as string).split(",").map((x) => x.trim())
					: [],
				lang: dire_attrs.lang ?? "zh-cn",
				description: attrs["custom-description"] ?? "No Description",
				content: content,
			};
			const safe_res = blog_post_schema.parse(res);
			const raw = await syncPost(safe_res);
			const dire_res = blog_post_schema.parse(raw);
			const cols = [
				"slug",
				"status",
				"id",
				"featured",
				"lang",
			] as (keyof BlogPost)[];
			const ret_attrs = Object.fromEntries(
				cols.map((x, _) => [`custom-directus-${x}`, dire_res[x]]),
			);
			const new_attrs = {
				...ret_attrs,
				"custom-directus-last-update": timestr,
				"custom-directus-tags": dire_res.tags.join(", "),
				"custom-description": dire_res.description,
			};
			await client.setBlockAttrs({ id: x.id, attrs: new_attrs });
            count += 1
		}),
	);
    console.log("updated", count)
	return {status: "1", data: `sync success. count: ${count}`};
};

console.log(await syncBlocks());
