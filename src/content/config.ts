import { defineCollection, z } from 'astro:content';

const blogCollection = defineCollection({
	type: 'content',
	schema: z.object({
		title: z.string(),
		pubDate: z.date(),
		description: z.string(),
		author: z.string().default('WonjongBot'),
		tags: z.array(z.string()).optional(),
	}),
});

const projectsCollection = defineCollection({
	type: 'content',
	schema: z.object({
		title: z.string(),
		year: z.number(),
		description: z.string(),
		link: z.string().url().optional(),
		github: z.string().url().optional(),
		image: z.string().optional(),
		chipModel: z.string().optional(), // Path to .glb file if applicable
	}),
});

export const collections = {
	'posts': blogCollection,
	'projects': projectsCollection,
};
