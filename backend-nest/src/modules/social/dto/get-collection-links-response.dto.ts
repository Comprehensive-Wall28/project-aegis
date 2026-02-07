export class LinkPostResponseDto {
  _id: string;
  collectionId: string;
  userId: {
    _id: string;
    username: string;
  };
  url: string;
  previewData: {
    title: string;
    description: string;
    image: string;
    favicon: string;
    scrapeStatus: string;
  };
  createdAt: string;
  updatedAt: string;
}

export class GetCollectionLinksResponseDto {
  links: LinkPostResponseDto[];
  totalCount: number;
  hasMore: boolean;
  viewedLinkIds: string[];
  commentCounts: Record<string, number>;
}
