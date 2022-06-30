const main = async () => {
  console.log(Math.round(new Date().getTime() / 1000));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
