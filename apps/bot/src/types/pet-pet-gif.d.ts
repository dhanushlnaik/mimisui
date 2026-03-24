declare module "pet-pet-gif" {
  type PetPetOptions = {
    resolution?: number;
    delay?: number;
    backgroundColor?: string | null;
  };

  export default function petPetGif(
    imageUrl: string,
    options?: PetPetOptions
  ): Promise<Buffer>;
}
